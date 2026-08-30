"use client"

let sharedCtx: AudioContext | null = null

const GROK_TTS_URL = "https://api.x.ai/v1/audio/speech"

export async function speak(text: string): Promise<void> {
  console.log("[tts] speaking:", text)

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.audioContent) {
        const binary = atob(data.audioContent)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

        if (!sharedCtx) sharedCtx = new AudioContext()
        const ctx = sharedCtx
        if (ctx.state === "suspended") await ctx.resume()

        const audioBuf = await ctx.decodeAudioData(bytes.buffer.slice(0))
        const source = ctx.createBufferSource()
        source.buffer = audioBuf
        source.connect(ctx.destination)
        source.start()
        await new Promise<void>((resolve) => {
          source.onended = () => resolve()
        })
        console.log("[tts] played successfully via server")
        return
      }
    }
    console.warn("[tts] server TTS failed, trying Grok directly")
  } catch {
    console.warn("[tts] server TTS unreachable, trying Grok directly")
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_GROK_VOICE_API_KEY || ""
    if (apiKey) {
      const res = await fetch(GROK_TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-voice-think-fast-1.0",
          input: text,
          voice: "echo",
          response_format: "mp3",
        }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        await new Promise<void>((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url)
            resolve()
          }
          audio.onerror = () => {
            URL.revokeObjectURL(url)
            resolve()
          }
          audio.play()
        })
        console.log("[tts] played via Grok direct")
        return
      }
      console.warn("[tts] Grok direct failed:", res.status)
    }
  } catch (err) {
    console.warn("[tts] Grok direct error:", err)
  }

  if (typeof window !== "undefined" && window.speechSynthesis) {
    console.log("[tts] falling back to browser speechSynthesis")
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "en-US"
    utterance.rate = 1.1
    window.speechSynthesis.speak(utterance)
    await new Promise<void>((resolve) => {
      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      setTimeout(() => resolve(), 8000)
    })
  }
}
