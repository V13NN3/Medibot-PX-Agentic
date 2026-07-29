import { NextResponse } from "next/server"
import { readVitals } from "@/lib/sensors"

export async function GET() {
  try {
    const vitals = await readVitals()
    return NextResponse.json(vitals)
  } catch (err) {
    console.error("[vitals/read] error:", err)
    return NextResponse.json({ error: "Failed to read vitals" }, { status: 500 })
  }
}
