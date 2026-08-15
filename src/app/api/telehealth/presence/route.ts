import { NextResponse } from "next/server"

export async function GET() {
  try {
    const mod = await import("../../../../../server/telehealth-signal.mjs")
    const doctors = (mod.getOnlineDoctors as (() => { doctorId: string; name: string; since: number | null }[]) | undefined)?.() ?? []
    return NextResponse.json({ doctors })
  } catch (err) {
    console.error("[telehealth/presence] error:", err)
    return NextResponse.json({ doctors: [] })
  }
}
