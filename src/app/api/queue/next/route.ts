import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const phOffset = 8 * 60
    const now = new Date()
    const phNow = new Date(now.getTime() + phOffset * 60 * 1000)
    const today = phNow.toISOString().slice(0, 10)

    const existing = await query(
      `SELECT id, current_number, now_serving FROM queue_counter WHERE queue_date = $1`,
      [today],
    )

    let number: number
    let nowServing: number

    if (existing.rows.length === 0) {
      number = 1
      nowServing = 0
      await query(
        `INSERT INTO queue_counter (queue_date, current_number, now_serving) VALUES ($1, $2, $3)`,
        [today, number, nowServing],
      )
    } else {
      const row = existing.rows[0]
      number = row.current_number + 1
      nowServing = row.now_serving
      await query(
        `UPDATE queue_counter SET current_number = $1, updated_at = NOW() WHERE id = $2`,
        [number, row.id],
      )
    }

    const formatted = `A-${String(number).padStart(3, "0")}`

    return NextResponse.json({
      number,
      formatted,
      nowServing,
      date: today,
    })
  } catch (err) {
    console.error("[queue/next] error:", err)
    return NextResponse.json({ error: "Failed to get next number" }, { status: 500 })
  }
}
