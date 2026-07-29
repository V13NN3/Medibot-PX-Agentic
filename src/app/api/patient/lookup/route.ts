import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { name, dob } = await req.json()

    if (!name || !dob) {
      return NextResponse.json({ error: "Missing name or dob" }, { status: 400 })
    }

    const result = await query(
      `SELECT id, name, dob, sex, address, contact_number, created_at
       FROM patients WHERE LOWER(name) = LOWER($1) AND dob = $2`,
      [name, dob],
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({ found: true, patient: result.rows[0] })
  } catch (err) {
    console.error("[patient/lookup] error:", err)
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 })
  }
}
