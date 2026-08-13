import { NextRequest, NextResponse } from "next/server"
import { printVitals } from "@/lib/printer"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { weight_kg, height_cm, temperature_c, oxygen_saturation, heart_rate, recorded_at } = body

    if (
      typeof weight_kg !== "number" ||
      typeof height_cm !== "number" ||
      typeof temperature_c !== "number" ||
      typeof oxygen_saturation !== "number" ||
      typeof heart_rate !== "number"
    ) {
      return NextResponse.json({ error: "Missing or invalid vitals fields" }, { status: 400 })
    }

    await printVitals({
      weight_kg,
      height_cm,
      temperature_c,
      oxygen_saturation,
      heart_rate,
      recorded_at,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[vitals/print] error:", err)
    return NextResponse.json({ error: "Print failed" }, { status: 500 })
  }
}
