"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

const POLL_INTERVAL = 5000

export function QueueMonitor() {
  const router = useRouter()
  const lastServing = useRef(0)
  const lastCheckedRef = useRef("")
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/queue/serving")
        if (!res.ok) return
        const data = await res.json()
        const current = data.nowServing || 0

        if (current > 0 && current !== lastServing.current) {
          const wasZero = lastServing.current === 0
          lastServing.current = current

          if (!wasZero) {
            const formatted = data.formatted || `A-${String(current).padStart(3, "0")}`

            if (window.location.pathname === "/") {
              router.push("/apps/queue")
            }

            announce(`Now serving ${formatted}`)

            const event = new CustomEvent("queue-update", {
              detail: { formatted, nowServing: current },
            })
            window.dispatchEvent(event)
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
