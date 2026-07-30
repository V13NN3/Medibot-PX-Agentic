import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const result = await query(
      `SELECT qt.formatted_number, qt.patient_name, qt.called_at,
              d.name as doctor_name
       FROM queue_tickets qt
       LEFT JOIN doctors d ON d.id = qt.doctor_id
       WHERE qt.status = 'called'
       ORDER BY qt.called_at DESC
       LIMIT 1`,
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ formatted: "A-000", nowServing: 0, patientName: "", doctorName: "" })
    }

    const row = result.rows[0]

    return NextResponse.json({
      formatted: row.formatted_number,
      nowServing: parseInt(row.formatted_number?.replace("A-", "") || "0", 10),
      patientName: row.patient_name,
      doctorName: row.doctor_name || "",
    })
  } catch (err) {
    console.error("[queue/serving] error:", err)
    return NextResponse.json({ error: "Failed to get serving" }, { status: 500 })
  }
}
