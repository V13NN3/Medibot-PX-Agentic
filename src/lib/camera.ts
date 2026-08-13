import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export interface HeightEstimate {
  height_cm: number
  confidence: number
  _source: string
  image_base64?: string
}

function isRpi(): boolean {
  return process.platform === "linux" && process.arch === "arm64"
}

async function captureStill(): Promise<{ base64: string; width: number; height: number } | null> {
  if (!isRpi()) return null

  const fs = await import("fs")
  const path = await import("path")
  const out = path.join("/tmp", `height-${Date.now()}.jpg`)
  const width = 1296
  const height = 972

  const candidates: Array<[string, string[]]> = [
    ["rpicam-still", ["-o", out, "-n", "--width", String(width), "--height", String(height), "--timeout", "2500"]],
    ["libcamera-still", ["-o", out, "-n", "--width", String(width), "--height", String(height), "--timeout", "2500"]],
  ]

  for (const [cmd, args] of candidates) {
    try {
      await execFileAsync(cmd, args, { timeout: 10000 })
      if (fs.existsSync(out)) {
        const buf = fs.readFileSync(out)
        console.log(`[camera] captured ${out} (${buf.length} bytes)`)
        return { base64: buf.toString("base64"), width, height }
      }
    } catch (err) {
      console.warn(`[camera] ${cmd} failed:`, err instanceof Error ? err.message : err)
    }
  }

  return null
}

const XAI_API_URL = "https://api.x.ai/v1/chat/completions"

function visionModelCandidates(): string[] {
  const configured = (process.env.GROK_VISION_MODEL || "grok-4.6").trim()
  const defaults = ["grok-4.6", "grok-4", "grok-3"]
  if (!configured) return defaults
  const list = [configured, ...defaults.filter((m) => m !== configured)]
  return [...new Set(list)]
}

async function askVision(imageBase64: string, width: number, height: number, model: string): Promise<{ height_cm: number; confidence: number }> {
  const apiKey = process.env.GROK_VISION_API_KEY || process.env.GROK_VOICE_API_KEY || ""
  if (!apiKey) {
    throw new Error("GROK_VISION_API_KEY not set")
  }

  const elevation = process.env.CAMERA_ELEVATION_CM || "133"
  const dataUrl = `data:image/jpeg;base64,${imageBase64}`

  const response = await fetch(XAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `A fixed camera is mounted at ${elevation} cm above ground level. A person stood about 3 steps (~2.5 m) away from the camera, facing it, standing upright with their feet on the ground. The full body is in frame and the feet are near the bottom of the image. The image is ${width}x${height} pixels. Estimate the person's height in centimeters. Respond with valid JSON only, in exactly this shape: {"height_cm": <number 60-230>, "confidence": <integer 0-100>}. If you cannot estimate, use confidence 0 and height_cm 170.`,
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      max_tokens: 200,
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error("[camera] xAI error:", response.status, errText)
    throw new Error(`xAI API error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ""

  let parsed: { height_cm?: number; confidence?: number } = {}
  try {
    parsed = JSON.parse(content)
  } catch {
    const match = content.match(/(\d+(?:\.\d+)?)/)
    if (match) parsed = { height_cm: parseFloat(match[1]) }
  }

  const heightCm = Number(parsed.height_cm)
  const clamped = Number.isFinite(heightCm) ? Math.min(230, Math.max(60, heightCm)) : 170
  const confidence = Number.isFinite(Number(parsed.confidence))
    ? Math.min(100, Math.max(0, Math.round(Number(parsed.confidence))))
    : 50

  console.log(`[camera] height estimate: ${clamped} cm (confidence ${confidence})`)
  return { height_cm: clamped, confidence }
}

export async function estimateHeight(): Promise<HeightEstimate> {
  try {
    const shot = await captureStill()
    if (!shot) {
      console.warn("[camera] no capture, returning mock height")
      return { height_cm: 172, confidence: 0, _source: "mock" }
    }
    let result: { height_cm: number; confidence: number } | null = null
    let lastErr: unknown = null
    for (const model of visionModelCandidates()) {
      try {
        result = await askVision(shot.base64, shot.width, shot.height, model)
        break
      } catch (err) {
        lastErr = err
        const msg = err instanceof Error ? err.message : String(err)
        if (!msg.includes("400") && !msg.includes("Model not found")) break
      }
    }
    if (!result) throw lastErr || new Error("all vision models failed")
    return { height_cm: result.height_cm, confidence: result.confidence, _source: "vision-ai", image_base64: shot.base64 }
  } catch (err) {
    console.error("[camera] height estimation failed:", err)
    return { height_cm: 172, confidence: 0, _source: "mock" }
  }
}
