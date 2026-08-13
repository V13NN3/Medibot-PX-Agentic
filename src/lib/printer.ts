export interface TicketData {
  number: string
  date: string
  time: string
}

export interface MedicationItem {
  name: string
  dosage?: string
  frequency?: string
  duration?: string
  instructions?: string
}

export interface PrescriptionData {
  formatted_number: string
  patient_name: string
  doctor_name?: string
  medications: MedicationItem[]
  note?: string
}

export interface VitalsData {
  weight_kg: number
  height_cm: number
  temperature_c: number
  oxygen_saturation: number
  heart_rate: number
  recorded_at?: string
}

function escpos(data: number[]): Buffer {
  return Buffer.from(data)
}

function getPrinterDevice(): string {
  return process.env.PRINTER_DEVICE || "/dev/usb/lp0"
}

export async function printTicket(ticket: TicketData): Promise<void> {
  const isRpi = process.platform === "linux" && process.arch === "arm64"

  const lines = [
    `MEDIBOT PX`,
    `Queue Ticket`,
    `─`.repeat(32),
    `Number: ${ticket.number}`,
    `Date:   ${ticket.date}`,
    `Time:   ${ticket.time}`,
    `─`.repeat(32),
    `Please wait for your number`,
    `to be called. Thank you!`,
    ``,
    ``,
    ``,
  ]

  const text = lines.join("\n")

  if (isRpi) {
    const fs = await import("fs")
    const device = getPrinterDevice()

    const bold = escpos([0x1b, 0x45, 0x01])
    const normal = escpos([0x1b, 0x45, 0x00])
    const center = escpos([0x1b, 0x61, 0x01])
    const left = escpos([0x1b, 0x61, 0x00])
    const doubleH = escpos([0x1b, 0x64, 0x02])
    const cut = escpos([0x1d, 0x56, 0x00])
    const feed = escpos([0x0a, 0x0a, 0x0a])

    const buf = Buffer.concat([
      center,
      doubleH,
      bold,
      Buffer.from("MEDIBOT PX\n"),
      normal,
      Buffer.from("════════════════════════════════\n"),
      Buffer.from(`Number: ${ticket.number}\n`),
      Buffer.from(`Date:   ${ticket.date}\n`),
      Buffer.from(`Time:   ${ticket.time}\n`),
      Buffer.from("════════════════════════════════\n"),
      left,
      Buffer.from("Please wait for your number\n"),
      Buffer.from("to be called. Thank you!\n"),
      feed,
      cut,
    ])

    fs.writeFileSync(device, buf)
  } else {
    console.log("[printer] ──────────────────────────────")
    console.log("[printer]  MEDIBOT PX")
    console.log("[printer]  Queue Ticket")
    console.log("[printer] ──────────────────────────────")
    console.log(`[printer]  Number: ${ticket.number}`)
    console.log(`[printer]  Date:   ${ticket.date}`)
    console.log(`[printer]  Time:   ${ticket.time}`)
    console.log("[printer] ──────────────────────────────")
    console.log("[printer]  Please wait for your number")
    console.log("[printer]  to be called. Thank you!")
    console.log("[printer] ──────────────────────────────")
  }
}

function buildPrescriptionLines(rx: PrescriptionData): string[] {
  const lines: string[] = [
    "MEDIBOT PX",
    "Prescription",
    `Ticket: ${rx.formatted_number}`,
    `Patient: ${rx.patient_name}`,
  ]
  if (rx.doctor_name) lines.push(`Doctor: ${rx.doctor_name}`)
  lines.push("─".repeat(32))
  ;(rx.medications || []).forEach((m, i) => {
    lines.push(`${i + 1}. ${m.name}`)
    if (m.dosage) lines.push(`   Dosage: ${m.dosage}`)
    if (m.frequency) lines.push(`   Frequency: ${m.frequency}`)
    if (m.duration) lines.push(`   Duration: ${m.duration}`)
    if (m.instructions) lines.push(`   Instructions: ${m.instructions}`)
  })
  if (rx.note) {
    lines.push("─".repeat(32))
    lines.push(`Note: ${rx.note}`)
  }
  lines.push("─".repeat(32))
  lines.push("Follow your doctor's instructions.")
  lines.push("", "", "")
  return lines
}

export async function printPrescription(rx: PrescriptionData): Promise<void> {
  const isRpi = process.platform === "linux" && process.arch === "arm64"

  const lines = buildPrescriptionLines(rx)
  const text = lines.join("\n")

  if (isRpi) {
    const fs = await import("fs")
    const device = getPrinterDevice()

    const bold = escpos([0x1b, 0x45, 0x01])
    const normal = escpos([0x1b, 0x45, 0x00])
    const center = escpos([0x1b, 0x61, 0x01])
    const left = escpos([0x1b, 0x61, 0x00])
    const doubleH = escpos([0x1b, 0x64, 0x02])
    const cut = escpos([0x1d, 0x56, 0x00])
    const feed = escpos([0x0a, 0x0a, 0x0a])

    const parts: Buffer[] = [
      center,
      doubleH,
      bold,
      Buffer.from("MEDIBOT PX\n"),
      normal,
      Buffer.from("════════════════════════════════\n"),
      left,
    ]
    for (const line of lines.slice(1)) {
      parts.push(Buffer.from(line + "\n"))
    }
    parts.push(center, Buffer.from("════════════════════════════════\n"), feed, cut)

    fs.writeFileSync(device, Buffer.concat(parts))
  } else {
    console.log("[printer] " + text.split("\n").join("\n[printer] "))
  }
}

function buildVitalsLines(v: VitalsData): string[] {
  const when = v.recorded_at ? new Date(v.recorded_at) : new Date()
  const date = when.toLocaleDateString()
  const time = when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  const rows = [
    `Weight:      ${v.weight_kg.toFixed(1)} kg`,
    `Height:      ${v.height_cm.toFixed(0)} cm`,
    `Temp:        ${v.temperature_c.toFixed(1)} C`,
    `SpO2:        ${v.oxygen_saturation.toFixed(0)} %`,
    `Heart Rate:  ${v.heart_rate.toFixed(0)} bpm`,
  ]

  return [
    "MEDIBOT PX",
    "Vitals Report",
    `Date: ${date}`,
    `Time: ${time}`,
    "─".repeat(32),
    ...rows,
    "─".repeat(32),
    "Thank you for visiting",
    "Medibot PX",
    "",
    "",
    "",
  ]
}

export async function printVitals(v: VitalsData): Promise<void> {
  const isRpi = process.platform === "linux" && process.arch === "arm64"

  const lines = buildVitalsLines(v)
  const text = lines.join("\n")

  if (isRpi) {
    const fs = await import("fs")
    const device = getPrinterDevice()

    const bold = escpos([0x1b, 0x45, 0x01])
    const normal = escpos([0x1b, 0x45, 0x00])
    const center = escpos([0x1b, 0x61, 0x01])
    const left = escpos([0x1b, 0x61, 0x00])
    const doubleH = escpos([0x1b, 0x64, 0x02])
    const cut = escpos([0x1d, 0x56, 0x00])
    const feed = escpos([0x0a, 0x0a, 0x0a])

    const parts: Buffer[] = [
      center,
      doubleH,
      bold,
      Buffer.from("MEDIBOT PX\n"),
      normal,
      Buffer.from("════════════════════════════════\n"),
      left,
    ]
    for (const line of lines.slice(1)) {
      parts.push(Buffer.from(line + "\n"))
    }
    parts.push(center, Buffer.from("════════════════════════════════\n"), feed, cut)

    fs.writeFileSync(device, Buffer.concat(parts))
  } else {
    console.log("[printer] " + text.split("\n").join("\n[printer] "))
  }
}
