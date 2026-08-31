import { NextResponse } from "next/server"
import { readPulseSensor } from "@/lib/sensors"

export const runtime = "nodejs"

export async function GET() {
  try {
    const result = await readPulseSensor()
    if (!result) {
      return NextResponse.json({ error: "Pulse sensor not available" }, { status: 503 })
    }
    return NextResponse.json({
      heart_rate: result.heart_rate,
      raw_adc: result.raw_adc_hr,
    })
  } catch (err) {
    console.error("[vitals/heartrate] error:", err)
    return NextResponse.json({ error: "Heart rate measurement failed" }, { status: 500 })
  }
}
