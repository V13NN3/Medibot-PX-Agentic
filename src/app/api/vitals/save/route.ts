import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { patient_id, weight_kg, height_cm, temperature_c, oxygen_saturation, heart_rate } = await req.json()

    if (!patient_id) {
      return NextResponse.json({ error: "Missing patient_id" }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO vitals_log (patient_id, weight_kg, height_cm, temperature_c, oxygen_saturation, heart_rate)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, recorded_at`,
      [
        patient_id,
        weight_kg ?? null,
        height_cm ?? null,
        temperature_c ?? null,
        oxygen_saturation ?? null,
        heart_rate ?? null,
      ],
    )

    return NextResponse.json({ saved: true, vitals: result.rows[0] })
  } catch (err) {
    console.error("[vitals/save] error:", err)
    return NextResponse.json({ error: "Failed to save vitals" }, { status: 500 })
  }
}
