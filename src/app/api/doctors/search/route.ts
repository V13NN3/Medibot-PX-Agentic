import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") || ""

    const result = await query(
      `SELECT d.id, d.name, d.specialty, d.avatar_initials, d.available,
              COALESCE(
                json_agg(
                  json_build_object('day_of_week', ds.day_of_week, 'start_time', ds.start_time, 'end_time', ds.end_time)
                  ORDER BY ds.day_of_week, ds.start_time
                ) FILTER (WHERE ds.id IS NOT NULL),
                '[]'
              ) AS schedule
       FROM doctors d
       LEFT JOIN doctor_schedule ds ON ds.doctor_id = d.id
       WHERE LOWER(d.name) LIKE LOWER($1) OR LOWER(d.specialty) LIKE LOWER($1)
       GROUP BY d.id
       ORDER BY d.available DESC, d.name`,
      [`%${q}%`],
    )

    return NextResponse.json({ doctors: result.rows })
  } catch (err) {
    console.error("[doctors/search] error:", err)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
