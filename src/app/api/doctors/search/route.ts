import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") || ""

    const result = await query(
      `SELECT id, name, specialty, avatar_initials FROM doctors
       WHERE LOWER(name) LIKE LOWER($1) OR LOWER(specialty) LIKE LOWER($1)
       ORDER BY name`,
      [`%${q}%`],
    )

    return NextResponse.json({ doctors: result.rows })
  } catch (err) {
    console.error("[doctors/search] error:", err)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
