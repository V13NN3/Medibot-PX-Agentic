"use client"

import { createContext, useCallback, useContext, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { PcmCapture, PcmPlayer, requestMic, unlockAudio } from "@/lib/pcm-audio"
import { toolDefinitions, toolHandlers } from "@/lib/tools"

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
  const router = useRouter()
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
        router.push("/")
      }
    }, NO_RESPONSE_TIMEOUT)
  }, [clearResponseWait, cleanup, router])

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
              instructions: `You are Medibot PX — Your Healthcare Assistant Robot.

WORKFLOW - Guide patients through these steps IN ORDER:
0. VITALS CHECK: If the patient wants to book an appointment or accesses the Appointment app directly (not from Find My Doctor):
   Ask: "Would you like to check your vitals (I'll measure your weight, height, and temperature) or an interactive diagnostic (tell me about your symptoms)?"
   - If VITALS: Say "Please stand on the platform to measure your weight." Call measure_vital("weight"). Then "Stand back for height." Call measure_vital("height"). Then "Come closer for temperature." Call measure_vital("temperature"). Then navigate_to("vitals").
   - BEFORE MEASURING HEIGHT: Say "Please step back 3 steps from the camera and stand straight with your feet on the ground, so your whole body is visible." THEN call measure_vital("height").
   - If INTERACTIVE: Discuss symptoms freely. After discussing, call log_symptom_check with what they said and what you advised. Then navigate_to("diagnostics", { search: "interactive" }).
   - If SKIP: Proceed directly to booking.
   Then proceed with steps 3-4 below.
1. PATIENT CHECK: Ask for their name. Use search_patients to look up by name.
   - If EXACTLY ONE match found: use lookup_patient with name + dob to verify, then navigate_to("patient", { search: name }).
   - If MULTIPLE matches found: tell them "I found several patients with that name." Ask for their date of birth or age to narrow down. Use lookup_patient with name + dob to find the right one.
   - If NO match found: call navigate_to("patient") to open the Patient Records screen, then ask for details (dob, sex, address, contact) and call create_patient.
   After identifying the patient, use navigate_to("patient", { search: name }) to show their record.
2. VITALS: navigate_to("vitals") to open the vitals app. Ask patient to step onto the sensors. Guide them through each step with measure_vital: weight, height, then temperature. After all measurements, ask if they want to save them.
   2a. HEIGHT: Before calling measure_vital("height"), tell the patient "Please step back 3 steps from the camera and stand straight with your feet on the ground, so your whole body is visible." Then call measure_vital("height").
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
  }, [cleanup, commitAndCreate, router, handleUserResponse, startNoResponseTimer])

  return (
    <VoiceEngineContext.Provider value={{ state, errorMsg, toggle }}>
      {children}
    </VoiceEngineContext.Provider>
  )
}

export const useVoiceEngine = () => useContext(VoiceEngineContext)
