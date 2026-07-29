"use client"

import { useState, useRef, useCallback } from "react"
import { PcmCapture, PcmPlayer } from "@/lib/pcm-audio"

type VoiceState = "idle" | "connecting" | "listening" | "responding" | "error"

const RELAY_URL = process.env.NEXT_PUBLIC_RELAY_URL || "ws://localhost:3002"
const SESSION_TIMEOUT = 8000
const SILENCE_THRESHOLD = 0.025
const SILENCE_FRAMES_MAX = 10

export function VoiceButton() {
  const [state, setState] = useState<VoiceState>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const stateRef = useRef(state)
  const wsRef = useRef<WebSocket | null>(null)
  const captureRef = useRef<PcmCapture | null>(null)
  const playerRef = useRef<PcmPlayer | null>(null)
  const mutedRef = useRef(false)
  const chunkCount = useRef(0)
  const silenceFrames = useRef(0)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  stateRef.current = state

  const commitAndCreate = useCallback(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    console.log("[voice] committing audio buffer + creating response")
    mutedRef.current = true
    setState("responding")
    ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }))
    ws.send(JSON.stringify({ type: "response.create" }))
  }, [])

  const cleanup = useCallback(() => {
    captureRef.current?.stop()
    captureRef.current = null
    wsRef.current?.close()
    wsRef.current = null
    playerRef.current?.stop()
    playerRef.current = null
    mutedRef.current = false
    chunkCount.current = 0
    silenceFrames.current = 0
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const toggle = useCallback(async () => {
    if (stateRef.current !== "idle" && stateRef.current !== "error") {
      if (stateRef.current === "listening") {
        commitAndCreate()
      }
      cleanup()
      setState("idle")
      setErrorMsg("")
      return
    }

    setState("connecting")
    setErrorMsg("")
    chunkCount.current = 0

    const ws = new WebSocket(RELAY_URL)
    wsRef.current = ws

    const capture = new PcmCapture()
    captureRef.current = capture
    const player = new PcmPlayer()
    playerRef.current = player

    player.onDrain = () => {
      if (stateRef.current === "responding") {
        console.log("[voice] playback drained, resuming listening")
        mutedRef.current = false
        setState("listening")
      }
    }

    let sessionTimedOut = false
    const sessionTimer = setTimeout(() => {
      if (!sessionTimedOut && stateRef.current === "connecting") {
        sessionTimedOut = true
        console.warn("[voice] session timeout — no session.updated received")
        cleanup()
        setState("error")
        setErrorMsg("Can't connect to voice relay. Is `npm run relay` running?")
      }
    }, SESSION_TIMEOUT)

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)

        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }))
          return
        }

        if (msg.type === "session.created") {
          console.log("[voice] session.created → sending session.update")
          ws.send(JSON.stringify({
            type: "session.update",
            session: {
              model: "grok-voice-think-fast-1.0",
              modalities: ["text", "audio"],
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
            },
          }))
          return
        }

        if (msg.type === "session.updated") {
          clearTimeout(sessionTimer)
          console.log("[voice] session.updated → starting audio capture")
          setState("listening")
          capture.start((base64, float32) => {
            chunkCount.current++
            if (!mutedRef.current && ws.readyState === WebSocket.OPEN) {
              if (chunkCount.current % 10 === 1) {
                console.log("[voice] sending audio chunk #" + chunkCount.current)
              }
              ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: base64 }))
            }
            if (!mutedRef.current && float32) {
              let sumSq = 0
              for (let i = 0; i < float32.length; i++) {
                sumSq += float32[i] * float32[i]
              }
              const rms = Math.sqrt(sumSq / float32.length)
              if (rms < SILENCE_THRESHOLD) {
                silenceFrames.current++
                if (silenceFrames.current >= SILENCE_FRAMES_MAX) {
                  silenceFrames.current = 0
                  ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }))
                  ws.send(JSON.stringify({ type: "response.create" }))
                  mutedRef.current = true
                  setState("responding")
                }
              } else {
                silenceFrames.current = 0
              }
            }
          }).catch((err) => {
            console.error("[voice] capture.start failed:", err)
            cleanup()
            setState("error")
            setErrorMsg("Microphone error: " + err.message)
          })
          return
        }

        if (msg.type === "input_audio_buffer.speech_started") {
          console.log("[voice] VAD: speech_started")
          return
        }

        if (msg.type === "input_audio_buffer.speech_stopped") {
          console.log("[voice] VAD: speech_stopped → committing + creating response")
          mutedRef.current = true
          setState("responding")
          ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }))
          ws.send(JSON.stringify({ type: "response.create" }))
          return
        }

        if (msg.type === "response.created") {
          console.log("[voice] response.created")
          return
        }

        if (msg.type === "response.output_audio.delta" && msg.delta) {
          console.log("[voice] audio delta:", msg.delta.length, "bytes")
          player.enqueueBase64(msg.delta)
          return
        }

        if (msg.type === "response.done") {
          console.log("[voice] response.done")
          return
        }

        if (msg.type === "error") {
          console.error("[voice] Grok error:", msg.error?.message || msg.message)
        }
      } catch {
        /* ignore parse errors */
      }
    }

    ws.onopen = () => {
      console.log("[voice] WebSocket connected, waiting for session.created...")
    }

    ws.onclose = (e) => {
      clearTimeout(sessionTimer)
      console.log("[voice] WebSocket closed:", e.code, e.reason)
      cleanup()
      if (stateRef.current !== "idle") {
        setState("idle")
      }
    }

    ws.onerror = (e) => {
      clearTimeout(sessionTimer)
      console.error("[voice] WebSocket error:", e)
      cleanup()
      setState("error")
      setErrorMsg("WebSocket connection failed. Is `npm run relay` running?")
    }
  }, [cleanup])

  const isIdle = state === "idle"
  const isListening = state === "listening"
  const isError = state === "error"

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={toggle}
        className={`w-40 h-40 rounded-full text-white text-lg font-semibold
                    flex items-center justify-center
                    shadow-lg transition-all duration-300 active:scale-95 cursor-pointer
                    ${
                      isError
                        ? "bg-gray-400 cursor-not-allowed"
                        : isListening
                          ? "bg-red-500 hover:bg-red-600 shadow-red-500/50"
                          : "bg-primary hover:bg-primary-dark shadow-primary/30"
                    }`}
        style={{
          animation:
            isIdle
              ? "pulse-glow 2.5s ease-in-out infinite"
              : isListening
                ? "pulse-recording 1.2s ease-in-out infinite"
                : "none",
        }}
      >
        <span className="text-center leading-tight">
          {isIdle && (
            <>
              A.I.
              <br />
              Companion
            </>
          )}
          {state === "connecting" && (
            <span className="animate-spin text-2xl">&#9696;</span>
          )}
          {isListening && (
            <>
              Listening
              <br />
              <span className="text-sm font-normal">tap to stop</span>
            </>
          )}
          {state === "responding" && (
            <>
              Speaking
              <br />
              <span className="text-sm font-normal">...</span>
            </>
          )}
          {isError && (
            <>
              Error
              <br />
              <span className="text-sm font-normal">tap to retry</span>
            </>
          )}
        </span>
      </button>

      {isError && errorMsg ? (
        <p className="text-xs text-red-500 max-w-[260px] text-center leading-relaxed">
          {errorMsg}
        </p>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 tracking-wider uppercase">
          {isIdle && <span className="animate-pulse">Tap to talk</span>}
          {state === "connecting" && "Connecting..."}
          {isListening && "Listening..."}
          {state === "responding" && "Speaking..."}
        </p>
      )}
    </div>
  )
}
