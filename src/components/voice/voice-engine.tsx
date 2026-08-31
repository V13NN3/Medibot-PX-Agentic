"use client"

import { createContext, useCallback, useContext, useRef, useState } from "react"
import { PcmCapture, PcmPlayer, requestMic, unlockAudio } from "@/lib/pcm-audio"
import { toolDefinitions, toolHandlers } from "@/lib/tools"
import { useAppOverlay } from "@/contexts/app-overlay-context"

export type VoiceState = "idle" | "connecting" | "listening" | "responding" | "error"

function resolveRelayUrl() {
  if (process.env.NEXT_PUBLIC_RELAY_URL) return process.env.NEXT_PUBLIC_RELAY_URL
  if (typeof window === "undefined") return "ws://localhost:3002"
  if (window.location.protocol === "https:") {
    const port = window.location.port || "443"
    return `wss://${window.location.hostname}:${port}/relay`
  }
  return `ws://${window.location.hostname}:3002`
}

const RELAY_URL = resolveRelayUrl()
const SESSION_TIMEOUT = 8000
const SILENCE_THRESHOLD = 0.025
const SILENCE_FRAMES_MAX = 10
const NO_RESPONSE_TIMEOUT = 5000

const TRANSCRIPT_APP_MAP: Array<{ keywords: string[]; app: string }> = [
  { keywords: ["register", "registration", "new patient", "sign up", "enroll", "patient record", "patient"], app: "patient" },
  { keywords: ["vitals", "weight", "height", "temperature", "blood pressure", "measure", "oxygen", "heart rate", "pulse"], app: "vitals" },
  { keywords: ["lab", "x-ray", "xray", "scan", "results", "blood test"], app: "labs" },
  { keywords: ["find doctor", "doctor", "specialist", "physician"], app: "find-doctor" },
  { keywords: ["appointment", "schedule", "book", "booking"], app: "appointment" },
  { keywords: ["symptom", "diagnostic", "diagnosis", "checkup", "feeling"], app: "diagnostics" },
  { keywords: ["queue", "line number", "ticket", "now serving"], app: "queue" },
  { keywords: ["prescription", "rx", "medicine", "medication"], app: "rx" },
  { keywords: ["emergency", "urgent", "telehealth", "video call", "doctor call"], app: "telehealth" },
]

function matchAppFromTranscript(transcript: string): string | null {
  for (const entry of TRANSCRIPT_APP_MAP) {
    for (const kw of entry.keywords) {
      if (transcript.includes(kw)) return entry.app
    }
  }
  return null
}

interface VoiceEngineValue {
  state: VoiceState
  errorMsg: string
  toggle: () => Promise<void>
}

const VoiceEngineContext = createContext<VoiceEngineValue>({
  state: "idle",
  errorMsg: "",
  toggle: async () => {},
})

export function VoiceEngineProvider({ children }: { children: React.ReactNode }) {
  const { openApp, closeApp } = useAppOverlay()
  const [state, setState] = useState<VoiceState>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const stateRef = useRef(state)
  const wsRef = useRef<WebSocket | null>(null)
  const captureRef = useRef<PcmCapture | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const playerRef = useRef<PcmPlayer | null>(null)
  const mutedRef = useRef(false)
  const chunkCount = useRef(0)
  const silenceFrames = useRef(0)
  const functionCallId = useRef("")
  const functionCallName = useRef("")
  const functionCallArgs = useRef("")
  const audioTranscriptRef = useRef("")
  const navigateCalledRef = useRef(false)
  const awaitingResponseRef = useRef(false)
  const responseWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reAskCountRef = useRef(0)

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
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null
    }
    wsRef.current?.close()
    wsRef.current = null
    playerRef.current?.stop()
    playerRef.current = null
    mutedRef.current = false
    chunkCount.current = 0
    silenceFrames.current = 0
    if (responseWaitTimerRef.current) {
      clearTimeout(responseWaitTimerRef.current)
      responseWaitTimerRef.current = null
    }
    awaitingResponseRef.current = false
    reAskCountRef.current = 0
  }, [])

  const clearResponseWait = useCallback(() => {
    if (responseWaitTimerRef.current) {
      clearTimeout(responseWaitTimerRef.current)
      responseWaitTimerRef.current = null
    }
    awaitingResponseRef.current = false
  }, [])

  const handleUserResponse = useCallback(() => {
    if (awaitingResponseRef.current) {
      console.log("[voice] patient responded during wait window")
      clearResponseWait()
      reAskCountRef.current = 0
    }
  }, [clearResponseWait])

  const startNoResponseTimer = useCallback(() => {
    clearResponseWait()
    awaitingResponseRef.current = true
    console.log("[voice] waiting 5s for patient response...")
    responseWaitTimerRef.current = setTimeout(() => {
      awaitingResponseRef.current = false
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      if (stateRef.current !== "listening") return
      if (reAskCountRef.current === 0) {
        reAskCountRef.current = 1
        console.log("[voice] no response — asking the patient again")
        setState("responding")
        ws.send(JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: "[System: The patient did not respond. Please gently ask them to speak again and wait for their response.]" }],
          },
        }))
        ws.send(JSON.stringify({ type: "response.create" }))
      } else {
        console.log("[voice] still no response — returning home and going idle")
        reAskCountRef.current = 0
        cleanup()
        setState("idle")
        closeApp()
      }
    }, NO_RESPONSE_TIMEOUT)
  }, [clearResponseWait, cleanup, closeApp])

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

    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      setState("error")
      setErrorMsg("Microphone permission is required for voice. Please allow microphone access and try again.")
      return
    }

    await unlockAudio()

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
        startNoResponseTimer()
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

    ws.onmessage = async (e) => {
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
              instructions: `You are Medibot PX — a healthcare kiosk AI.

RULES — BREAK THESE AND YOU FAIL:
1. NEVER talk more than 5 words at a time. Examples: "Opening now.", "What's your name?", "Done!", "Step on scale."
2. ALWAYS call the tool FIRST. Then say 1 short word. Example: call navigate_to → say "Opening."
3. NEVER say "let me", "I will", "I'll open", "please wait". Just DO IT.
4. NEVER explain what you're doing. Just do it and confirm in 1-3 words.
5. NEVER give medical diagnoses. Say "I'm not a doctor. Please see a professional."

WORKFLOW — what the patient says → what you do:
- "register" / "new patient" / "sign up" → navigate_to("patient") → say "Opening."
- "check vitals" / "measure" / "weight" / "height" → navigate_to("vitals") → say "Opening."
- "scan lab" / "lab results" / "x-ray" → navigate_to("labs") → say "Opening."
- "find doctor" / "see a doctor" → navigate_to("find-doctor") → say "Opening."
- "book appointment" / "schedule" → navigate_to("appointment") → say "Opening."
- "symptoms" / "diagnostic" → navigate_to("diagnostics") → say "Opening."
- "queue" / "line number" → navigate_to("queue") → say "Opening."
- Emergency → navigate_to("telehealth") → say "Opening emergency."

REGISTRATION FLOW:
- Patient says name → search_patients(name). If no match → navigate_to("patient") → say "Registering."
- Collect: name, DOB, sex, address, phone. Use fill_patient_field for each.
- After all fields → create_patient.

VITALS FLOW:
- navigate_to("vitals") → say "Step on scale."
- measure_vital("weight") → measure_vital("height") → measure_vital("temperature")
- For height: say "Step back 3 steps." THEN measure.

LAB FLOW:
- navigate_to("labs") → say "Hold paper to camera."
- capture_lab_photo → interpret_lab_results → discuss briefly.

GREETING: "Hi! I'm Medibot. What would you like to do?"`,
              tools: toolDefinitions,
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
              if (awaitingResponseRef.current) {
                if (rms >= SILENCE_THRESHOLD) {
                  handleUserResponse()
                  silenceFrames.current = 0
                }
                return
              }
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
            }, micStreamRef.current || undefined).catch((err) => {
              console.error("[voice] capture.start failed:", err)
              if (wsRef.current === ws) {
                cleanup()
                setState("error")
                setErrorMsg("Microphone error: " + err.message)
              }
            })
          return
        }

        if (msg.type === "input_audio_buffer.speech_started") {
          console.log("[voice] VAD: speech_started")
          handleUserResponse()
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
          audioTranscriptRef.current = ""
          navigateCalledRef.current = false
          return
        }

        if (msg.type === "response.function_call_arguments.start") {
          functionCallId.current = msg.call_id || ""
          functionCallName.current = msg.function_name || ""
          functionCallArgs.current = ""
          console.log("[voice] function_call start:", msg.function_name)
          return
        }

        if (msg.type === "response.function_call_arguments.delta") {
          functionCallArgs.current += msg.delta || ""
          return
        }

        if (msg.type === "response.function_call_arguments.done") {
          const name = functionCallName.current
          const callId = functionCallId.current
          const raw = functionCallArgs.current

          console.log("[voice] function_call done:", name)

          functionCallId.current = ""
          functionCallName.current = ""
          functionCallArgs.current = ""

          try {
            const args = raw ? JSON.parse(raw) : {}

            if (name === "navigate_to") {
              navigateCalledRef.current = true
              const app = String(args.app || "")
              const params: Record<string, string> = {}
              if (args.search) params.search = String(args.search)
              if (app === "home") {
                closeApp()
              } else {
                openApp(app, Object.keys(params).length > 0 ? params : undefined)
              }
              ws.send(JSON.stringify({
                type: "conversation.item.create",
                item: { type: "function_call_output", call_id: callId, output: JSON.stringify({ navigated_to: app }) },
              }))
            } else {
              const handler = toolHandlers[name]
              if (!handler) {
                console.warn("[voice] no handler for tool:", name)
                ws.send(JSON.stringify({
                  type: "conversation.item.create",
                  item: { type: "function_call_output", call_id: callId, output: JSON.stringify({ error: `Unknown tool: ${name}` }) },
                }))
              } else {
                const output = await handler(args)
                ws.send(JSON.stringify({
                  type: "conversation.item.create",
                  item: { type: "function_call_output", call_id: callId, output },
                }))
              }
            }
          } catch (err) {
            console.error("[voice] function_call error:", err)
            ws.send(JSON.stringify({
              type: "conversation.item.create",
              item: { type: "function_call_output", call_id: callId, output: JSON.stringify({ error: String(err) }) },
            }))
          }

          ws.send(JSON.stringify({ type: "response.create" }))
          return
        }

        if (msg.type === "response.output_audio.delta" && msg.delta) {
          console.log("[voice] audio delta:", msg.delta.length, "bytes")
          player.enqueueBase64(msg.delta)
          return
        }

        if (msg.type === "response.audio_transcript.delta") {
          audioTranscriptRef.current += msg.delta || ""
          if (!navigateCalledRef.current) {
            const partial = audioTranscriptRef.current.toLowerCase()
            const app = matchAppFromTranscript(partial)
            if (app) {
              console.log("[voice] transcript matches app mid-speech:", app)
              openApp(app)
            }
          }
          return
        }

        if (msg.type === "response.audio_transcript.done") {
          if (msg.transcript) audioTranscriptRef.current = msg.transcript
          console.log("[voice] transcript:", audioTranscriptRef.current)
          return
        }

        if (msg.type === "response.done") {
          console.log("[voice] response.done")
          const transcript = audioTranscriptRef.current.toLowerCase()
          if (!navigateCalledRef.current) {
            const app = matchAppFromTranscript(transcript)
            if (app) {
              console.log("[voice] final transcript fallback — opening:", app)
              openApp(app)
            }
          }
          audioTranscriptRef.current = ""
          navigateCalledRef.current = false
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
      if (wsRef.current !== ws) {
        console.log("[voice] stale onclose ignored:", e.code, e.reason)
        return
      }
      clearTimeout(sessionTimer)
      console.log("[voice] WebSocket closed:", e.code, e.reason)
      cleanup()
      if (stateRef.current !== "idle") {
        setState("idle")
      }
    }

    ws.onerror = (e) => {
      if (wsRef.current !== ws) {
        return
      }
      clearTimeout(sessionTimer)
      console.error("[voice] WebSocket error:", e)
      cleanup()
      setState("error")
      setErrorMsg("WebSocket connection failed. Is `npm run relay` running?")
    }
  }, [cleanup, commitAndCreate, handleUserResponse, startNoResponseTimer])

  return (
    <VoiceEngineContext.Provider value={{ state, errorMsg, toggle }}>
      {children}
    </VoiceEngineContext.Provider>
  )
}

export const useVoiceEngine = () => useContext(VoiceEngineContext)
