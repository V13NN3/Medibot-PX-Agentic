import { NextResponse } from "next/server"
import { captureFacePhoto } from "@/lib/camera"

export async function POST() {
  try {
    const shot = await captureFacePhoto()
    if (!shot) {
      return NextResponse.json({ error: "Camera unavailable" }, { status: 500 })
    }
    return NextResponse.json({ image_base64: shot.image_base64 })
  } catch (err) {
    console.error("[camera/face] error:", err)
    return NextResponse.json({ error: "Capture failed" }, { status: 500 })
  }
}
