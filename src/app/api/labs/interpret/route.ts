import { NextRequest, NextResponse } from "next/server"

const XAI_API_URL = "https://api.x.ai/v1/chat/completions"

const VISION_MODELS = [
  process.env.GROK_VISION_MODEL || "grok-4.6",
  "grok-4.6",
  "grok-4",
  "grok-3",
]

export async function POST(req: NextRequest) {
  try {
    const { image_base64 } = await req.json()

    if (!image_base64) {
      return NextResponse.json({ error: "Missing image_base64" }, { status: 400 })
    }

    const apiKey = process.env.GROK_VISION_API_KEY || process.env.GROK_VOICE_API_KEY || ""

    if (!apiKey) {
      return NextResponse.json({
        summary: "Lab results processed",
        interpretation: [
          { name: "Glucose", value: "93", unit: "mg/dL", status: "normal", note: "Within reference range 65–99" },
          { name: "BUN", value: "7", unit: "mg/dL", status: "low", note: "Slightly below reference 8–20" },
        ],
        disclaimer: true,
        _source: "mock",
      })
    }

    const dataUrl = `data:image/jpeg;base64,${image_base64}`

    const payload = {
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract all lab test results visible in this image. For each result, provide: name, value, unit, reference range, and whether it's normal/high/low. Format as JSON array with fields: name, value, unit, referenceLow, referenceHigh, status (normal/high/low). Also provide a brief summary paragraph. Respond with valid JSON only.`,
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.1,
    }

    let response: Response | null = null
    for (const model of [...new Set(VISION_MODELS)]) {
      const res = await fetch(XAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ ...payload, model }),
      })
      if (!res.ok) {
        const errText = await res.text()
        console.error(`[labs/interpret] xAI error (${model}):`, res.status, errText)
        if (res.status === 400 && errText.includes("Model not found")) continue
        throw new Error(`xAI API error: ${res.status}`)
      }
      response = res
      break
    }
    if (!response) throw new Error("all vision models failed")

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ""

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = { summary: content, results: [] }
    }

    return NextResponse.json({
      summary: parsed.summary || "Lab results analyzed.",
      results: parsed.results || parsed.interpretation || [],
      disclaimer: true,
      _source: "vision-ai",
    })
  } catch (err) {
    console.error("[labs/interpret] error:", err)
    return NextResponse.json({ error: "Interpretation failed" }, { status: 500 })
  }
}
