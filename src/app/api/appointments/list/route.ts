import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const doctorId = req.nextUrl.searchParams.get("doctorId")
    const patientName = req.nextUrl.searchParams.get("patientName")

    const conditions: string[] = []
    const params: unknown[] = []
    let idx = 1

    if (doctorId) {
      conditions.push(`a.doctor_id = $${idx++}`)
      params.push(doctorId)
    }
    if (patientName) {
      conditions.push(`LOWER(a.patient_name) LIKE $${idx++}`)
      params.push(`%${patientName}%`)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    const result = await query(
      `SELECT a.id, a.patient_name, a.appointment_date, a.appointment_time,
              a.reason, a.status, a.created_at,
              d.name as doctor_name
       FROM appointments a
       LEFT JOIN doctors d ON d.id = a.doctor_id
       ${where}
       ORDER BY a.appointment_date DESC, a.appointment_time DESC
       LIMIT 20`,
      params,
    )

    return NextResponse.json({ appointments: result.rows })
  } catch (err) {
    console.error("[appointments/list] error:", err)
    return NextResponse.json({ error: "Failed to list appointments" }, { status: 500 })
  }
}
