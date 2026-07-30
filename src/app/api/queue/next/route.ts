import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { patient_name, doctor_id } = await req.json()

    const phOffset = 8 * 60
    const now = new Date()
    const phNow = new Date(now.getTime() + phOffset * 60 * 1000)
    const today = phNow.toISOString().slice(0, 10)

    const existing = await query(
      `SELECT id, current_number FROM queue_counter WHERE queue_date = $1`,
      [today],
    )

    let number: number
    let counterId: string

    if (existing.rows.length === 0) {
      number = 1
      const ins = await query(
        `INSERT INTO queue_counter (queue_date, current_number) VALUES ($1, $2) RETURNING id`,
        [today, number],
      )
      counterId = ins.rows[0].id
    } else {
      const row = existing.rows[0]
      counterId = row.id
      number = row.current_number + 1
      await query(
        `UPDATE queue_counter SET current_number = $1, updated_at = NOW() WHERE id = $2`,
        [number, counterId],
      )
    }

    const formatted = `A-${String(number).padStart(3, "0")}`

    await query(
      `INSERT INTO queue_tickets (ticket_number, formatted_number, patient_name, doctor_id, status, queue_date)
       VALUES ($1, $2, $3, $4, 'waiting', $5)`,
      [number, formatted, patient_name || "Unknown", doctor_id || null, today],
    )

    return NextResponse.json({
      number,
      formatted,
      date: today,
    })
  } catch (err) {
    console.error("[queue/next] error:", err)
    return NextResponse.json({ error: "Failed to get next number" }, { status: 500 })
  }
}
