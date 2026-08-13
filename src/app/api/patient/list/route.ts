import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const result = await query(
      `SELECT id, name, dob, sex, photo FROM patients
       ORDER BY created_at DESC
       LIMIT 8`,
    )
    return NextResponse.json({ patients: result.rows })
  } catch (err) {
    console.error("[patient/list] error:", err)
    return NextResponse.json({ error: "Failed to load patients" }, { status: 500 })
  }
}
