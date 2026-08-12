import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const number = (req.nextUrl.searchParams.get("number") || "").trim().toUpperCase()
    const name = (req.nextUrl.searchParams.get("name") || "").trim()

    if (!number || !name) {
      return NextResponse.json({ error: "Missing number or name" }, { status: 400 })
    }

    const padded = /^\d+$/.test(number) ? `A-${number.padStart(3, "0")}` : number

    const result = await query(
      `SELECT p.id, p.formatted_number, p.patient_name, p.doctor_id, p.medications, p.note, p.created_at,
              d.name AS doctor_name
       FROM prescriptions p
       LEFT JOIN doctors d ON d.id = p.doctor_id
       WHERE p.formatted_number = $1
         AND LOWER(p.patient_name) LIKE $2
       ORDER BY p.created_at DESC
       LIMIT 5`,
      [padded, `%${name.toLowerCase()}%`],
    )

    return NextResponse.json({ prescriptions: result.rows })
  } catch (err) {
    console.error("[rx/lookup] error:", err)
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 })
  }
}
