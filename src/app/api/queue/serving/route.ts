import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

const phOffset = 8 * 60

function getToday(): string {
  const now = new Date()
  const phNow = new Date(now.getTime() + phOffset * 60 * 1000)
  return phNow.toISOString().slice(0, 10)
}

export async function GET() {
  try {
    const today = getToday()
    const result = await query(
      `SELECT current_number, now_serving FROM queue_counter WHERE queue_date = $1`,
      [today],
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ formatted: "A-000", nowServing: 0, currentNumber: 0 })
    }

    const row = result.rows[0]
    const formatted = `A-${String(row.now_serving).padStart(3, "0")}`

    return NextResponse.json({
      formatted,
      nowServing: row.now_serving,
      currentNumber: row.current_number,
    })
  } catch (err) {
    console.error("[queue/serving] error:", err)
    return NextResponse.json({ error: "Failed to get serving number" }, { status: 500 })
  }
}

export async function POST() {
  try {
    const today = getToday()
    const result = await query(
      `UPDATE queue_counter SET now_serving = now_serving + 1, updated_at = NOW()
       WHERE queue_date = $1
       RETURNING current_number, now_serving`,
      [today],
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "No queue started today" }, { status: 400 })
    }

    const row = result.rows[0]
    const formatted = `A-${String(row.now_serving).padStart(3, "0")}`

    return NextResponse.json({
      formatted,
      nowServing: row.now_serving,
      currentNumber: row.current_number,
    })
  } catch (err) {
    console.error("[queue/serving] POST error:", err)
    return NextResponse.json({ error: "Failed to increment serving" }, { status: 500 })
  }
}
