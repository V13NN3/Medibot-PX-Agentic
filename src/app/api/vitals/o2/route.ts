import { NextResponse } from "next/server"
import { readO2Sensor } from "@/lib/sensors"

export const runtime = "nodejs"

export async function GET() {
  try {
    const result = await readO2Sensor()
    if (!result) {
      return NextResponse.json({ error: "O2 sensor not available" }, { status: 503 })
    }
    return NextResponse.json({
      o2_percentage: result.o2_percentage,
      raw_adc: result.raw_adc,
    })
  } catch (err) {
    console.error("[vitals/o2] error:", err)
    return NextResponse.json({ error: "O2 measurement failed" }, { status: 500 })
  }
}
