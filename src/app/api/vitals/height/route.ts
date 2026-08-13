import { NextResponse } from "next/server"
import { estimateHeight } from "@/lib/camera"

export async function POST() {
  try {
    const result = await estimateHeight()
    return NextResponse.json(result)
  } catch (err) {
    console.error("[vitals/height] error:", err)
    return NextResponse.json({ error: "Height measurement failed" }, { status: 500 })
  }
}
