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
      o2_percentage: result.o2_percentage,
      heart_rate: result.heart_rate,
      raw_adc_o2: result.raw_adc_o2,
      raw_adc_hr: result.raw_adc_hr,
    })
  } catch (err) {
    console.error("[vitals/pulse] error:", err)
    return NextResponse.json({ error: "Pulse measurement failed" }, { status: 500 })
  }
}
