"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useVoiceEngine } from "@/components/voice/voice-engine"
import { speak } from "@/lib/tts"

const POLL_INTERVAL = 5000

export function QueueMonitor() {
  const router = useRouter()
  const { state: voiceState } = useVoiceEngine()
  const lastCallAt = useRef<string | null>(null)
  const lastServing = useRef("")
  const voiceStateRef = useRef(voiceState)
  voiceStateRef.current = voiceState

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/queue/serving")
        if (!res.ok) return
        const data = await res.json()
        const current = data.formatted || "A-000"
        const calledAt = data.calledAt || null

        if (current === "A-000") {
          lastCallAt.current = null
          lastServing.current = ""
          return
        }

        const isNewCall = calledAt !== lastCallAt.current
        lastCallAt.current = calledAt
        lastServing.current = current

        if (!isNewCall) return
        if (voiceStateRef.current !== "idle") return

        router.push("/apps/queue")

        let message = `Now serving ${current}`
        if (data.patientName && data.patientName !== "Unknown") message += `, ${data.patientName}`
        if (data.doctorName) message += ` — please see ${data.doctorName}`

        speak(message)

        window.dispatchEvent(
          new CustomEvent("queue-update", {
            detail: { formatted: current, patientName: data.patientName, doctorName: data.doctorName },
          }),
        )
      } catch {
        /* ignore polling errors */
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL)
    poll()

    return () => clearInterval(interval)
  }, [router])

  return null
}
