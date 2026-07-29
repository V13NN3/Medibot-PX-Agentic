"use client"

import { useState, useRef, useCallback } from "react"
import { PcmCapture, PcmPlayer } from "@/lib/pcm-audio"

type VoiceState = "idle" | "connecting" | "listening" | "responding"

const RELAY_URL = process.env.NEXT_PUBLIC_RELAY_URL || "ws://localhost:3002"

export function VoiceButton() {
  const [state, setState] = useState<VoiceState>("idle")
  const stateRef = useRef(state)
  const wsRef = useRef<WebSocket | null>(null)
  const captureRef = useRef<PcmCapture | null>(null)
  const playerRef = useRef<PcmPlayer | null>(null)
  const mutedRef = useRef(false)
  const sessionReady = useRef(false)

  stateRef.current = state

  const cleanup = useCallback(() => {
    captureRef.current?.stop()
    captureRef.current = null
    wsRef.current?.close()
    wsRef.current = null
    playerRef.current?.stop()
    playerRef.current = null
    mutedRef.current = false
    sessionReady.current = false
  }, [])

  const toggle = useCallback(async () => {
    if (stateRef.current !== "idle") {
      cleanup()
      setState("idle")
      return
    }

    setState("connecting")
    sessionReady.current = false

    const ws = new WebSocket(RELAY_URL)
    wsRef.current = ws

    const capture = new PcmCapture()
    captureRef.current = capture
    const player = new PcmPlayer()
    playerRef.current = player

    player.onDrain = () => {
      if (stateRef.current === "responding") {
        mutedRef.current = false
        setState("listening")
      }
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)

        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }))
          return
        }

        if (msg.type === "session.created") {
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
          sessionReady.current = true
          setState("listening")
          capture.start((base64) => {
            if (!mutedRef.current && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: base64 }))
            }
          }).catch(() => {
            cleanup()
            setState("idle")
          })
          return
        }

        if (msg.type === "input_audio_buffer.speech_stopped") {
          mutedRef.current = true
          setState("responding")
          ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }))
          ws.send(JSON.stringify({ type: "response.create" }))
          return
        }

        if (msg.type === "response.output_audio.delta" && msg.delta) {
          player.enqueueBase64(msg.delta)
          return
        }

        if (msg.type === "error") {
          console.error("[voice] Grok error:", msg.message)
        }
      } catch {
        /* ignore parse errors */
      }
    }

    ws.onclose = () => {
      cleanup()
      setState("idle")
    }

    ws.onerror = () => {
      cleanup()
      setState("idle")
    }
  }, [cleanup])

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={toggle}
        className={`w-40 h-40 rounded-full text-white text-lg font-semibold
                    flex items-center justify-center
                    shadow-lg transition-all duration-300 active:scale-95 cursor-pointer
                    ${
                      state === "listening"
                        ? "bg-red-500 hover:bg-red-600 shadow-red-500/50"
                        : state === "idle"
                          ? "bg-primary hover:bg-primary-dark shadow-primary/30"
                          : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/50"
                    }`}
        style={{
          animation:
            state === "idle"
              ? "pulse-glow 2.5s ease-in-out infinite"
              : state === "listening"
                ? "pulse-recording 1.2s ease-in-out infinite"
                : "none",
        }}
      >
        <span className="text-center leading-tight">
          {state === "idle" && (
            <>
              A.I.
              <br />
              Companion
            </>
          )}
          {state === "connecting" && (
            <span className="animate-spin text-2xl">&#9696;</span>
          )}
          {state === "listening" && (
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
        </span>
      </button>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 tracking-wider uppercase">
        {state === "idle" && <span className="animate-pulse">Tap to talk</span>}
        {state === "connecting" && "Connecting..."}
        {state === "listening" && "Listening..."}
        {state === "responding" && "Speaking..."}
      </p>
    </div>
  )
}
