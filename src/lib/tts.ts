"use client"

let sharedCtx: AudioContext | null = null

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
        console.log("[tts] played via Google TTS")
        return
      }
    }
  } catch {
    /* server TTS unavailable */
  }

  if (typeof window !== "undefined" && window.speechSynthesis) {
    console.log("[tts] using browser speechSynthesis")
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
