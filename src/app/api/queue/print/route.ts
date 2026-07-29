import { NextRequest, NextResponse } from "next/server"
import { printTicket } from "@/lib/printer"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { number, date, time } = body

    if (!number || !date || !time) {
      return NextResponse.json({ error: "Missing required fields: number, date, time" }, { status: 400 })
    }

    await printTicket({ number, date, time })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[queue/print] error:", err)
    return NextResponse.json({ error: "Print failed" }, { status: 500 })
  }
}
