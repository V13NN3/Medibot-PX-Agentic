import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { name, dob, sex, address, contact_number } = await req.json()

    if (!name || !dob || !sex) {
      return NextResponse.json({ error: "Missing required fields: name, dob, sex" }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO patients (name, dob, sex, address, contact_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, dob, sex, created_at`,
      [name, dob, sex, address || null, contact_number || null],
    )

    return NextResponse.json({ patient: result.rows[0] })
  } catch (err) {
    console.error("[patient/create] error:", err)
    return NextResponse.json({ error: "Create failed" }, { status: 500 })
  }
}
