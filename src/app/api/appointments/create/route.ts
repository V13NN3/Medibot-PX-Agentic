import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { patient_name, doctor_id, appointment_date, appointment_time, reason } = await req.json()

    if (!patient_name || !doctor_id || !appointment_date || !appointment_time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO appointments (patient_name, doctor_id, appointment_date, appointment_time, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, patient_name, appointment_date, appointment_time, status`,
      [patient_name, doctor_id, appointment_date, appointment_time, reason || null],
    )

    return NextResponse.json({ appointment: result.rows[0] })
  } catch (err) {
    console.error("[appointments/create] error:", err)
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 })
  }
}
