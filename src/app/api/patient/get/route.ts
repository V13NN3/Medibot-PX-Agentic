import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { id, dob } = await req.json()

    if (!id || !dob) {
      return NextResponse.json({ error: "Missing id or dob" }, { status: 400 })
    }

    const result = await query(
      `SELECT id, name, dob, sex, address, contact_number, created_at, photo
       FROM patients WHERE id = $1 AND dob = $2`,
      [id, dob],
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ verified: false })
    }

    return NextResponse.json({ verified: true, patient: result.rows[0] })
  } catch (err) {
    console.error("[patient/get] error:", err)
    return NextResponse.json({ error: "Failed to get patient" }, { status: 500 })
  }
}
