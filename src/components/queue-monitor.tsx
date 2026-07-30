"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

const POLL_INTERVAL = 5000

export function QueueMonitor() {
  const router = useRouter()
  const lastServing = useRef("")
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/queue/serving")
        if (!res.ok) return
        const data = await res.json()
        const current = data.formatted || "A-000"

        if (current !== "A-000" && current !== lastServing.current) {
          const wasEmpty = lastServing.current === ""
          lastServing.current = current

          if (!wasEmpty) {
            if (window.location.pathname === "/") {
              router.push("/apps/queue")
            }

            let message = `Now serving ${current}`
            if (data.patientName) message += `, ${data.patientName}`
            if (data.doctorName) message += ` — please see ${data.doctorName}`

            announce(message)

            window.dispatchEvent(
              new CustomEvent("queue-update", {
                detail: { formatted: current, patientName: data.patientName, doctorName: data.doctorName },
              }),
            )
          }
        }
      } catch {
        /* ignore polling errors */
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL)
    poll()

    return () => clearInterval(interval)
  }, [router])

  const announce = async (text: string) => {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (!data.audioContent) return

      const binary = atob(data.audioContent)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

      const ctx = audioCtxRef.current || new AudioContext()
      audioCtxRef.current = ctx
      if (ctx.state === "suspended") await ctx.resume()

      const audioBuf = await ctx.decodeAudioData(bytes.buffer)
      const source = ctx.createBufferSource()
      source.buffer = audioBuf
      source.connect(ctx.destination)
      source.start()
    } catch {
      /* ignore TTS errors */
    }
  }

  return null
}
