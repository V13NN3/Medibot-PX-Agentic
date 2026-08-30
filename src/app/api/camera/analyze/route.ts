import { NextRequest, NextResponse } from "next/server"
import { analyzePhoto } from "@/lib/camera"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { image_base64, width, height } = body
    if (!image_base64) {
      return NextResponse.json({ error: "Missing image_base64" }, { status: 400 })
    }
    const result = await analyzePhoto(image_base64, width || 1296, height || 972)
    return NextResponse.json(result)
  } catch (err) {
    console.error("[camera/analyze] error:", err)
    return NextResponse.json({ gender: "unknown", estimated_weight_kg: 70 })
  }
}
