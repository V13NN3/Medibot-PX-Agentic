import { NextRequest, NextResponse } from "next/server"

const XAI_API_URL = "https://api.x.ai/v1/chat/completions"
const SYSTEM_PROMPT = `You are Medibot PX — a friendly, professional healthcare assistant robot.
The patient is in a clinic, waiting for their doctor. They may describe symptoms and ask about possible causes.

Rules:
- Provide educational, general information about possible causes and things to monitor.
- NEVER give a definitive diagnosis. Always say "could be", "may indicate", or "might be related to".
- Always encourage seeing their doctor for a proper diagnosis.
- If symptoms are serious (chest pain, difficulty breathing, severe bleeding, sudden severe headache), clearly advise seeking urgent care immediately.
- Keep responses concise and clear, using short paragraphs and simple bullet points.
- Use plain text only (no markdown headers).`

function mockAnswer(symptom: string): string {
  return `Thanks for telling me about "${symptom || "your symptom"}".

That symptom could be linked to several common causes. Some possibilities:
- A viral infection (common cold or flu)
- Stress or fatigue
- A minor inflammation

Things you can watch for:
- How long the symptom lasts
- Whether it gets worse or spreads
- Any new symptoms that appear

I'm an AI assistant, not a doctor. This information is for reference only. Please consult a qualified healthcare professional for proper diagnosis and treatment. If the symptom is severe or getting worse, please tell the staff right away.`
}

export async function POST(req: NextRequest) {
  try {
    const { messages, age, sex } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 })
    }

    const apiKey = process.env.GROK_VOICE_API_KEY || ""

    if (!apiKey) {
      const last = messages[messages.length - 1]
      const symptom = last?.content || ""
      return NextResponse.json({ reply: mockAnswer(symptom), disclaimer: true, _source: "mock" })
    }

    const context = `Patient context: ${age ? `Age ${age}.` : ""} ${sex ? `Sex ${sex}.` : ""}`
    const response = await fetch(XAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-2-latest",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: context },
          ...messages,
        ],
        max_tokens: 500,
        temperature: 0.4,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error("[symptom-chat] xAI error:", response.status, errText)
      const last = messages[messages.length - 1]
      return NextResponse.json({ reply: mockAnswer(last?.content || ""), disclaimer: true, _source: "mock" })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || mockAnswer("")

    return NextResponse.json({ reply, disclaimer: true, _source: "ai" })
  } catch (err) {
    console.error("[symptom-chat] error:", err)
    return NextResponse.json({ error: "Symptom chat failed" }, { status: 500 })
  }
}
