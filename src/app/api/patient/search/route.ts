import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") || ""

    if (q.length < 2) {
      return NextResponse.json({ patients: [] })
    }

    const result = await query(
      `SELECT id, name, dob, sex, photo FROM patients
       WHERE LOWER(name) LIKE LOWER($1)
       ORDER BY name
       LIMIT 8`,
      [`%${q}%`],
    )

    return NextResponse.json({ patients: result.rows })
  } catch (err) {
    console.error("[patient/search] error:", err)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
