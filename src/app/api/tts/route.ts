import { NextRequest, NextResponse } from "next/server"

const GROK_TTS_URL = "https://api.x.ai/v1/audio/speech"
const GROK_API_KEY = process.env.GROK_VOICE_API_KEY || ""

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 })
    }

    console.log("[tts] server-side Grok TTS:", text.substring(0, 80))

    if (!GROK_API_KEY) {
      console.error("[tts] GROK_VOICE_API_KEY not set")
      return NextResponse.json({ error: "No TTS API key" }, { status: 500 })
    }

    const response = await fetch(GROK_TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-voice-think-fast-1.0",
        input: text,
        voice: "echo",
        response_format: "mp3",
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("[tts] Grok API error:", response.status, err)
      return NextResponse.json({ error: "TTS failed" }, { status: 500 })
    }

    const arrayBuf = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuf).toString("base64")
    console.log("[tts] Grok TTS success:", base64.length, "bytes base64")

    return NextResponse.json({ audioContent: base64 })
  } catch (err) {
    console.error("[tts] error:", err)
    return NextResponse.json({ error: "TTS failed" }, { status: 500 })
  }
}
