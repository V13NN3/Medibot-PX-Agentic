import { NextRequest, NextResponse } from "next/server"

const GOOGLE_TTS_URL = process.env.GOOGLE_TTS_API_URL || "https://texttospeech.googleapis.com/v1/text:synthesize"
const GOOGLE_TTS_KEY = process.env.GOOGLE_TTS_API_KEY || ""

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 })
    }

    console.log("[tts] server-side TTS:", text.substring(0, 80))

    if (!GOOGLE_TTS_KEY) {
      console.warn("[tts] No GOOGLE_TTS_API_KEY set, returning empty so client uses browser speechSynthesis")
      return NextResponse.json({ audioContent: null })
    }

    const response = await fetch(`${GOOGLE_TTS_URL}?key=${GOOGLE_TTS_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "en-US", name: "en-US-Standard-F" },
        audioConfig: { audioEncoding: "MP3", speakingRate: 1.1 },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("[tts] Google API error:", response.status, err)
      return NextResponse.json({ audioContent: null })
    }

    const data = await response.json()
    console.log("[tts] Google TTS success:", data.audioContent?.length ?? 0, "chars")
    return NextResponse.json({ audioContent: data.audioContent })
  } catch (err) {
    console.error("[tts] error:", err)
    return NextResponse.json({ audioContent: null })
  }
}
