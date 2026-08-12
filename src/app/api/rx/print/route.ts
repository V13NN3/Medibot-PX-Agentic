import { NextRequest, NextResponse } from "next/server"
import { printPrescription } from "@/lib/printer"

export async function POST(req: NextRequest) {
  try {
    const { prescription } = await req.json()

    if (!prescription || !prescription.formatted_number || !prescription.patient_name) {
      return NextResponse.json({ error: "Missing prescription data" }, { status: 400 })
    }

    await printPrescription({
      formatted_number: prescription.formatted_number,
      patient_name: prescription.patient_name,
      doctor_name: prescription.doctor_name,
      medications: prescription.medications || [],
      note: prescription.note,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[rx/print] error:", err)
    return NextResponse.json({ error: "Print failed" }, { status: 500 })
  }
}
