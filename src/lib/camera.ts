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

export async function captureFacePhoto(): Promise<{ image_base64: string } | null> {
  const shot = await captureStill()
  if (!shot) return null
  return { image_base64: shot.base64 }
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

  const elevation = process.env.CAMERA_ELEVATION_CM || "150"
  const dataUrl = `data:image/jpeg;base64,${imageBase64}`

  const prompt = `A fixed camera is mounted exactly ${elevation} cm above ground level on a robot.
A person stood approximately 3 steps (~2.5 meters) away from the camera, facing it directly, standing upright with feet on the ground.
The image is ${width}x${height} pixels.

TASK: Estimate the person's height in centimeters by analyzing their proportions in the image.

APPROACH:
1. Identify the top of the person's head and the bottom of their feet in the image.
2. Calculate what percentage of the image height the person occupies.
3. Use the known camera elevation (${elevation} cm) and approximate distance (2.5 m) to convert pixel height to real-world height.
4. Consider the camera's field of view and angle — the camera is at ${elevation} cm, so if the person appears shorter than the camera height in the image, they are farther away or shorter than ${elevation} cm.
5. A typical adult is between 150-190 cm. Use body proportions (head-to-body ratio is roughly 1:7 for adults) as a sanity check.

Respond with valid JSON only, in exactly this shape:
{"height_cm": <number 100-220>, "confidence": <integer 1-100>}

Confidence guide:
- 80-100: Full body clearly visible, feet and head both in frame, good lighting
- 50-79: Most of body visible, minor obstruction or blur
- 20-49: Partial view, heavy blur, or poor lighting
- 1-19: Very uncertain, making best guess from available clues

Do NOT default to any specific number. Always attempt your best estimate based on the visual evidence.`

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
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 300,
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
  console.log(`[camera] raw Grok response (model=${model}):`, content)

  let parsed: { height_cm?: number; confidence?: number } = {}
  try {
    parsed = JSON.parse(content)
  } catch {
    const match = content.match(/\{[^}]*"height_cm"[^}]*\}/)
    if (match) {
      try { parsed = JSON.parse(match[0]) } catch { /* ignore */ }
    }
    if (!parsed.height_cm) {
      const numMatch = content.match(/height_cm["\s:]*(\d+(?:\.\d+)?)/i)
      if (numMatch) parsed = { height_cm: parseFloat(numMatch[1]), confidence: 30 }
    }
  }

  console.log("[camera] parsed height:", parsed)

  const heightCm = Number(parsed.height_cm)
  const clamped = Number.isFinite(heightCm) ? Math.min(220, Math.max(100, heightCm)) : null
  if (clamped === null) {
    console.warn("[camera] could not parse height from response, returning null")
    return { height_cm: 0, confidence: 0 }
  }
  const confidence = Number.isFinite(Number(parsed.confidence))
    ? Math.min(100, Math.max(1, Math.round(Number(parsed.confidence))))
    : 20

  console.log(`[camera] height estimate: ${clamped} cm (confidence ${confidence})`)
  return { height_cm: clamped, confidence }
}

export async function estimateHeightFromImage(
  imageBase64: string,
  width: number,
  height: number,
): Promise<HeightEstimate> {
  let bestResult: { height_cm: number; confidence: number } | null = null
  let lastErr: unknown = null

  for (const model of visionModelCandidates()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await askVision(imageBase64, width, height, model)
        console.log(`[camera] model=${model} attempt=${attempt + 1} → ${result.height_cm}cm (confidence ${result.confidence})`)
        if (result.height_cm === 0) continue
        if (!bestResult || result.confidence > bestResult.confidence) {
          bestResult = result
        }
        if (result.confidence >= 50) break
      } catch (err) {
        lastErr = err
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[camera] model=${model} attempt=${attempt + 1} failed:`, msg)
        if (!msg.includes("400") && !msg.includes("Model not found")) break
      }
    }
    if (bestResult && bestResult.confidence >= 50) break
  }

  if (!bestResult || bestResult.height_cm === 0) {
    console.warn("[camera] all height estimation attempts failed or returned 0")
    throw lastErr || new Error("all vision models failed")
  }

  console.log(`[camera] best height result: ${bestResult.height_cm}cm (confidence ${bestResult.confidence})`)
  return {
    height_cm: bestResult.height_cm,
    confidence: bestResult.confidence,
    _source: "vision-ai",
    image_base64: imageBase64,
  }
}

export async function estimateHeight(): Promise<HeightEstimate> {
  try {
    const shot = await captureStill()
    if (!shot) {
      console.warn("[camera] no capture, returning mock height")
      return { height_cm: 0, confidence: 0, _source: "no-capture" }
    }
    console.log(`[camera] captured photo: ${shot.width}x${shot.height}, ${(shot.base64.length / 1024).toFixed(0)}KB`)
    return await estimateHeightFromImage(shot.base64, shot.width, shot.height)
  } catch (err) {
    console.error("[camera] height estimation failed:", err)
    return { height_cm: 0, confidence: 0, _source: "error" }
  }
}

export interface PhotoAnalysis {
  gender: "male" | "female" | "unknown"
  estimated_weight_kg: number
}

export async function analyzePhoto(imageBase64: string, width: number, height: number): Promise<PhotoAnalysis> {
  const apiKey = process.env.GROK_VISION_API_KEY || process.env.GROK_VOICE_API_KEY || ""
  if (!apiKey) {
    console.warn("[camera] no API key for analyzePhoto, returning defaults")
    return { gender: "unknown", estimated_weight_kg: 70 }
  }

  const dataUrl = `data:image/jpeg;base64,${imageBase64}`
  const models = visionModelCandidates()

  for (const model of models) {
    try {
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
                  text: `Analyze this full-body photo of a person standing in front of a camera. The image is ${width}x${height} pixels.

1. Estimate the person's gender (male or female) based on body shape, build, and appearance.
2. Estimate the person's weight in kilograms based on their body proportions and build.

Respond with valid JSON only, in exactly this shape:
{"gender": "male" or "female", "estimated_weight_kg": <number 30-200>}

If you cannot determine gender, use "unknown" and estimate weight as 70.`,
                },
                {
                  type: "image_url",
                  image_url: { url: dataUrl },
                },
              ],
            },
          ],
          max_tokens: 200,
          temperature: 0.2,
        }),
      })

      if (!response.ok) continue

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ""

      let parsed: { gender?: string; estimated_weight_kg?: number } = {}
      try {
        parsed = JSON.parse(content)
      } catch {
        continue
      }

      const gender = parsed.gender === "male" || parsed.gender === "female" ? parsed.gender : "unknown"
      const weight = Number.isFinite(Number(parsed.estimated_weight_kg))
        ? Math.min(200, Math.max(30, Number(parsed.estimated_weight_kg)))
        : 70

      console.log(`[camera] photo analysis: gender=${gender} weight=${weight}kg (model=${model})`)
      return { gender, estimated_weight_kg: weight }
    } catch (err) {
      console.warn(`[camera] analyzePhoto model ${model} failed:`, err)
    }
  }

  console.warn("[camera] analyzePhoto: all models failed, returning defaults")
  return { gender: "unknown", estimated_weight_kg: 70 }
}
