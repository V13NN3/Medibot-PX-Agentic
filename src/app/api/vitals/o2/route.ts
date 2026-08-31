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
      raw_adc: result.raw_adc_o2,
    })
  } catch (err) {
    console.error("[vitals/o2] error:", err)
    return NextResponse.json({ error: "O2 measurement failed" }, { status: 500 })
  }
}
