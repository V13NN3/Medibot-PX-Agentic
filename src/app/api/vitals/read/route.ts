import { NextRequest, NextResponse } from "next/server"
import { readVitals } from "@/lib/sensors"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const patientId = req.nextUrl.searchParams.get("patient_id")

    if (patientId) {
      const result = await query(
        `SELECT id, weight_kg, height_cm, temperature_c, oxygen_saturation, heart_rate, recorded_at
         FROM vitals_log
         WHERE patient_id = $1
         ORDER BY recorded_at DESC
         LIMIT 20`,
        [patientId],
      )
      return NextResponse.json({ records: result.rows })
    }

    const vitals = await readVitals()
    return NextResponse.json(vitals)
  } catch (err) {
    console.error("[vitals/read] error:", err)
    return NextResponse.json({ error: "Failed to read vitals" }, { status: 500 })
  }
}
