import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { image_base64 } = await req.json()

    if (!image_base64) {
      return NextResponse.json({ error: "Missing image_base64" }, { status: 400 })
    }

    const isRpi = process.platform === "linux" && process.arch === "arm64"

    if (isRpi) {
      const fs = await import("fs")
      const path = await import("path")
      const filename = `lab-capture-${Date.now()}.jpg`
      const dest = path.join("/tmp", filename)
      const buffer = Buffer.from(image_base64, "base64")
      fs.writeFileSync(dest, buffer)
      console.log("[labs/capture] saved to", dest)
    }

    return NextResponse.json({ captured: true })
  } catch (err) {
    console.error("[labs/capture] error:", err)
    return NextResponse.json({ error: "Capture failed" }, { status: 500 })
  }
}
