"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { PcmCapture, PcmPlayer } from "@/lib/pcm-audio"
import { toolDefinitions, toolHandlers } from "@/lib/tools"
import { useMenu } from "@/components/ui/menu-context"

type VoiceState = "idle" | "connecting" | "listening" | "responding" | "error"

const RELAY_URL =
  process.env.NEXT_PUBLIC_RELAY_URL ||
  (typeof window !== "undefined"
    ? `ws://${window.location.hostname}:3002`
    : "ws://localhost:3002")
const SESSION_TIMEOUT = 8000
const SILENCE_THRESHOLD = 0.025
const SILENCE_FRAMES_MAX = 10

interface VoiceButtonProps {
  compact?: boolean
}

export function VoiceButton({ compact = false }: VoiceButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const isHome = pathname === "/"
  const { isOpen: menuOpen } = useMenu()

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
  const functionCallId = useRef("")
  const functionCallName = useRef("")
  const functionCallArgs = useRef("")

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
              instructions: `You are Medibot PX — Your Healthcare Assistant Robot.

WORKFLOW - Guide patients through these steps IN ORDER:
0. DIAGNOSTIC CHOICE: If the patient wants to book an appointment or accesses the Appointment app directly (not from Find My Doctor):
   Ask: "Would you like a basic diagnostic (I'll measure your weight, height, and temperature) or an interactive diagnostic (tell me about your symptoms)?"
   - If BASIC: Say "Please stand on the platform to measure your weight." Call measure_vital("weight"). Then "Stand back for height." Call measure_vital("height"). Then "Come closer for temperature." Call measure_vital("temperature"). Then navigate_to("diagnostics", { search: "basic" }).
   - If INTERACTIVE: Discuss symptoms freely. After discussing, call log_symptom_check with what they said and what you advised. Then navigate_to("diagnostics", { search: "interactive" }).
   - If SKIP: Proceed directly to booking.
   Then proceed with steps 3-4 below.
1. PATIENT CHECK: Ask for their name. Use search_patients to look up by name.
   - If EXACTLY ONE match found: use lookup_patient with name + dob to verify, then navigate_to("patient", { search: name }).
   - If MULTIPLE matches found: tell them "I found several patients with that name." Ask for their date of birth or age to narrow down. Use lookup_patient with name + dob to find the right one.
   - If NO match found: ask for details (dob, sex, address, contact) and call create_patient.
   After identifying the patient, use navigate_to("patient", { search: name }) to show their record.
2. VITALS: navigate_to("diagnostics") to show the diagnostics screen. Ask patient to step onto the sensors. Call read_vitals.
  2b. LAB RESULTS: Ask "Do you have any lab results you'd like me to review?"
    - If yes: "Please hold your lab result paper up to the camera so I can read it."
      Call navigate_to("labs") to open the camera page.
      Once the camera is open: "I can see the paper. Hold still..." Call capture_lab_photo.
      After capture: "Let me analyze your results." Call interpret_lab_results.
      Then discuss the findings: mention which values are normal, which are out of range.
      ALWAYS include the medical disclaimer after discussing results.
    - If no: proceed to next step.
 3. DOCTOR: Ask the patient "Who is your doctor?" or "Do you have a specific doctor in mind, or would you like me to find a specialist?".
    - Call find_doctor with their response (name or specialty).
    - If results include available doctors: tell the patient who's available. Use navigate_to("find-doctor", { search: query }) to show the list.
    - If the doctor they want is NOT available: tell them, and ask "Would you like to schedule an appointment for when they're available?"
 4. APPOINTMENT: If the patient agrees or the doctor is unavailable, ask "What date and time works for you?" and "What's the reason for your visit?" Collect the details verbally.
    - Use navigate_to("appointment", { search: doctorName }) to show the booking page with doctor pre-selected.
    - After the patient provides date, time, and reason: call book_appointment with patient_name, doctor_name, date, time, and reason.
    - On success: say "Your appointment is confirmed!" and navigate_to("appointment") to show the confirmation.
5. URGENT CARE: If the patient indicates an emergency or urgent need, use navigate_to("telehealth") for a video call with a doctor instead of the queue.
6. QUEUE: navigate_to("queue") to show the queue screen. Call get_queue_number with patient_name and doctor_name to assign a ticket with thermal print. Tell them their number.
7. WAIT: Tell patient to wait for their number to be called. They can ask about Now Serving anytime. They are already on the queue screen from step 6.

MEDICAL DISCLAIMER (CRITICAL):
- You are an AI healthcare assistant, NOT a doctor or medical professional.
- Whenever providing symptom information, possible causes, or recommendations, you MUST include this exact disclaimer: "I'm an AI assistant, not a doctor. This information is for reference only. Please consult a qualified healthcare professional for proper diagnosis and treatment."
- Never diagnose definitively. Always say "could be" or "may indicate" — never state "you have".
- For serious symptoms (chest pain, difficulty breathing, severe bleeding), immediately advise emergency care.

LENGTH RULES (STRICT):
- Keep ALL spoken responses SHORT — one or two sentences max. Ask short questions, give short instructions, confirm actions briefly.
- Long, detailed explanations are allowed ONLY during:
  1. DIAGNOSTICS: when discussing symptoms, possible causes, or recommendations after log_symptom_check.
  2. LAB RESULTS: when explaining findings after interpret_lab_results (which values are normal vs out of range).
- Everywhere else (greeting, registration, vitals, doctor lookup, appointment, queue, waiting, confirmations) NEVER give long explanations — just be brief.

PERSONALITY:
- Friendly, professional, calm, reassuring.
- First greeting must say: "This is Medibot PX — Your Healthcare Assistant Robot — I'm here to help you register, check your vitals, and find your doctor."
- Use TOOLS to perform actions. Wait for tool results before continuing.
- Never mention Grok, xAI, or any AI company. You are Medibot PX.`,
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
              const app = String(args.app || "")
              const search = args.search ? `?search=${encodeURIComponent(String(args.search))}` : ""
              const path = app === "home" ? "/" : `/apps/${app}${search}`
              router.push(path)
              ws.send(JSON.stringify({
                type: "conversation.item.create",
                item: { type: "function_call_output", call_id: callId, output: JSON.stringify({ navigated_to: path }) },
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
  }, [cleanup, commitAndCreate, router])

  if (compact) {
    if (isHome && !menuOpen) return null
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-1">
        {state !== "idle" && state !== "error" && (
          <div className="text-[10px] font-mono text-gray-500 bg-white/80 dark:bg-gray-900/80 px-2 py-1 rounded-full shadow-sm backdrop-blur">
            {state === "connecting" && "Connecting..."}
            {state === "listening" && "Listening..."}
            {state === "responding" && "Speaking..."}
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          className={`relative w-14 h-14 rounded-full text-white text-sm font-bold
                      flex items-center justify-center
                      shadow-lg transition-all duration-200 active:scale-90 cursor-pointer
                      ${
                        state === "error"
                          ? "bg-gray-400"
                          : state === "listening"
                            ? "bg-red-500 hover:bg-red-600 shadow-red-500/50"
                            : "bg-primary hover:bg-primary-dark shadow-primary/30"
                      }`}
          style={{
            animation: state === "listening" ? "pulse-recording 1.2s ease-in-out infinite" : "none",
          }}
        >
          {state === "responding" && (
            <>
              <span aria-hidden className="absolute inset-0 rounded-full border-2 border-primary/40 wave-ring" />
              <span aria-hidden className="absolute inset-0 rounded-full border-2 border-primary/30 wave-ring" style={{ animationDelay: "0.45s" }} />
              <span aria-hidden className="absolute inset-0 rounded-full border-2 border-primary/20 wave-ring" style={{ animationDelay: "0.9s" }} />
            </>
          )}
          {state === "idle" && <span>AI</span>}
          {state === "connecting" && <span className="animate-spin">&#9696;</span>}
          {state === "listening" && <span className="text-lg">&#9673;</span>}
          {state === "responding" && <span className="text-lg">&#9654;</span>}
          {state === "error" && <span>&#10007;</span>}
        </button>
      </div>
    )
  }

return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={toggle}
        className={`relative w-40 h-40 rounded-full text-white text-lg font-semibold
                    flex items-center justify-center
                    shadow-lg transition-all duration-300 active:scale-95 cursor-pointer
                    ${
                      state === "error"
                        ? "bg-gray-400 cursor-not-allowed"
                        : state === "listening"
                          ? "bg-red-500 hover:bg-red-600 shadow-red-500/50"
                          : "bg-primary hover:bg-primary-dark shadow-primary/30"
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
        {state === "responding" && (
          <>
            <span aria-hidden className="absolute inset-0 rounded-full border-[6px] border-primary/40 wave-ring" />
            <span aria-hidden className="absolute inset-0 rounded-full border-[6px] border-primary/30 wave-ring" style={{ animationDelay: "0.45s" }} />
            <span aria-hidden className="absolute inset-0 rounded-full border-[6px] border-primary/20 wave-ring" style={{ animationDelay: "0.9s" }} />
          </>
        )}
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
          {state === "error" && (
            <>
              Error
              <br />
              <span className="text-sm font-normal">tap to retry</span>
            </>
          )}
        </span>
      </button>

      {state === "error" && errorMsg ? (
        <p className="text-xs text-red-500 max-w-[260px] text-center leading-relaxed">{errorMsg}</p>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 tracking-wider uppercase">
          {state === "idle" && <span className="animate-pulse">Tap to talk</span>}
          {state === "connecting" && "Connecting..."}
          {state === "listening" && "Listening..."}
          {state === "responding" && "Speaking..."}
        </p>
      )}
    </div>
  )
}
