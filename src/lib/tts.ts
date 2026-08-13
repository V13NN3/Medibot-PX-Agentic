"use client"

let sharedCtx: AudioContext | null = null

export async function speak(text: string): Promise<void> {
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
  } catch {
    /* ignore TTS errors */
  }
}
