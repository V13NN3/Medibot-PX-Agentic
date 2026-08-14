import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const number = (req.nextUrl.searchParams.get("number") || "").trim().toUpperCase()
    const name = (req.nextUrl.searchParams.get("name") || "").trim()

    if (!number || !name) {
      return NextResponse.json({ error: "Missing number or name" }, { status: 400 })
    }

    const padded = /^\d+$/.test(number) ? `A-${number.padStart(3, "0")}` : number

    const result = await query(
      `SELECT p.id, p.formatted_number, p.patient_name, p.doctor_id, p.medications, p.note, p.created_at,
              d.name AS doctor_name
       FROM prescriptions p
       LEFT JOIN doctors d ON d.id = p.doctor_id
       WHERE p.formatted_number = $1
         AND LOWER(p.patient_name) LIKE $2
       ORDER BY p.created_at DESC
       LIMIT 5`,
      [padded, `%${name.toLowerCase()}%`],
    )

    if (result.rows.length === 0) {
      const placeholder = {
        id: `test-${padded}`,
        formatted_number: padded,
        patient_name: name,
        doctor_name: "Dr. Maria Santos",
        medications: [
          { name: "Paracetamol", dosage: "500 mg", frequency: "3x a day after meals", duration: "5 days", instructions: "Take 1 tablet every 6 hours as needed for fever or pain." },
          { name: "Amoxicillin", dosage: "500 mg", frequency: "2x a day", duration: "7 days", instructions: "Complete the full course even if you feel better." },
        ],
        note: "This is a sample test prescription. Please see your doctor for your actual prescription.",
        created_at: new Date().toISOString(),
        test: true,
      }
      return NextResponse.json({ prescriptions: [placeholder] })
    }

    return NextResponse.json({ prescriptions: result.rows })
  } catch (err) {
    console.error("[rx/lookup] error:", err)
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 })
  }
}
