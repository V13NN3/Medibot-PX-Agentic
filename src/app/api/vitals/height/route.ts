import { NextRequest, NextResponse } from "next/server"
import { estimateHeight, estimateHeightFromImage } from "@/lib/camera"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    if (body.image_base64) {
      const width = Number(body.width) || 1280
      const height = Number(body.height) || 720
      const result = await estimateHeightFromImage(body.image_base64, width, height)
      return NextResponse.json(result)
    }
    const result = await estimateHeight()
    return NextResponse.json(result)
  } catch (err) {
    console.error("[vitals/height] error:", err)
    return NextResponse.json({ error: "Height measurement failed" }, { status: 500 })
  }
}
