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

interface PrinterTarget {
  device: string
  kind: "usb" | "serial"
}

function resolvePrinterTarget(): PrinterTarget | null {
  const fs = require("fs") as typeof import("fs")
  const candidates = process.env.PRINTER_DEVICE
    ? [process.env.PRINTER_DEVICE]
    : ["/dev/usb/lp0", "/dev/ttyUSB0", "/dev/ttyUSB1", "/dev/ttyACM0"]
  for (const device of candidates) {
    if (fs.existsSync(device)) {
      return { device, kind: device.startsWith("/dev/tty") ? "serial" : "usb" }
    }
  }
  return null
}

function configureSerial(device: string): void {
  const { execSync } = require("child_process") as typeof import("child_process")
  const baud = process.env.PRINTER_BAUD || "9600"
  execSync(`stty -F ${device} ${baud} raw -echo -onlcr -opost -crtscts`, { stdio: "ignore" })
}

async function writePrintBytes(buf: Buffer): Promise<void> {
  const target = resolvePrinterTarget()
  if (!target) {
    throw new Error("No printer device found. Check /dev/usb/lp0, /dev/ttyUSB0, or set PRINTER_DEVICE.")
  }
  const fs = await import("fs")
  if (target.kind === "serial") {
    configureSerial(target.device)
    const fd = fs.openSync(target.device, fs.constants.O_WRONLY | fs.constants.O_NONBLOCK)
    try {
      fs.writeSync(fd, buf)
    } finally {
      fs.closeSync(fd)
    }
  } else {
    fs.writeFileSync(target.device, buf)
  }
  console.log(`[printer] wrote ${buf.length} bytes to ${target.device}`)
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

    await writePrintBytes(buf)
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

function buildPrescriptionParts(rx: PrescriptionData): { header: string[]; body: string[] } {
  const header = [
    "Prescription",
    `Ticket: ${rx.formatted_number}`,
    `Patient: ${rx.patient_name}`,
  ]
  if (rx.doctor_name) header.push(`Doctor: ${rx.doctor_name}`)

  const body: string[] = []
  ;(rx.medications || []).forEach((m, i) => {
    body.push(`${i + 1}. ${m.name}`)
    if (m.dosage) body.push(`   Dosage: ${m.dosage}`)
    if (m.frequency) body.push(`   Frequency: ${m.frequency}`)
    if (m.duration) body.push(`   Duration: ${m.duration}`)
    if (m.instructions) body.push(`   Instructions: ${m.instructions}`)
  })
  if (rx.note) {
    body.push(`Note: ${rx.note}`)
  }
  body.push("Follow your doctor's instructions.")
  return { header, body }
}

export async function printPrescription(rx: PrescriptionData): Promise<void> {
  const isRpi = process.platform === "linux" && process.arch === "arm64"

  const { header, body } = buildPrescriptionParts(rx)
  const text = ["MEDIBOT PX", ...header, ...body].join("\n")

  if (isRpi) {
    const bold = escpos([0x1b, 0x45, 0x01])
    const normal = escpos([0x1b, 0x45, 0x00])
    const center = escpos([0x1b, 0x61, 0x01])
    const left = escpos([0x1b, 0x61, 0x00])
    const doubleH = escpos([0x1b, 0x64, 0x02])
    const cut = escpos([0x1d, 0x56, 0x00])
    const feed = escpos([0x0a, 0x0a, 0x0a])
    const sep = Buffer.from("════════════════════════════════\n")

    const parts: Buffer[] = [
      center,
      doubleH,
      bold,
      Buffer.from("MEDIBOT PX\n"),
      normal,
      sep,
    ]
    for (const line of header) {
      parts.push(Buffer.from(line + "\n"))
    }
    parts.push(sep, left)
    for (const line of body) {
      parts.push(Buffer.from(line + "\n"))
    }
    parts.push(feed, cut)

    await writePrintBytes(Buffer.concat(parts))
  } else {
    console.log("[printer] " + text.split("\n").join("\n[printer] "))
  }
}

function buildVitalsParts(v: VitalsData): { header: string[]; body: string[] } {
  const when = v.recorded_at ? new Date(v.recorded_at) : new Date()
  const date = when.toLocaleDateString()
  const time = when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  const heightCm = v.height_cm
  const totalIn = Math.round(heightCm / 2.54)
  const ft = Math.floor(totalIn / 12)
  const inch = totalIn % 12

  const header = ["Vitals Report", `Date: ${date}`, `Time: ${time}`]

  const body = [
    `Weight:      ${v.weight_kg.toFixed(1)} kg`,
    `Height:      ${heightCm.toFixed(0)} cm (${ft}'${inch}")`,
    `Temp:        ${v.temperature_c.toFixed(1)} C`,
    `SpO2:        ${v.oxygen_saturation.toFixed(0)} %`,
    `Heart Rate:  ${v.heart_rate.toFixed(0)} bpm`,
  ]

  return { header, body }
}

export async function printVitals(v: VitalsData): Promise<void> {
  const isRpi = process.platform === "linux" && process.arch === "arm64"

  const { header, body } = buildVitalsParts(v)
  const text = ["MEDIBOT PX", ...header, ...body].join("\n")

  if (isRpi) {
    const bold = escpos([0x1b, 0x45, 0x01])
    const normal = escpos([0x1b, 0x45, 0x00])
    const center = escpos([0x1b, 0x61, 0x01])
    const left = escpos([0x1b, 0x61, 0x00])
    const doubleH = escpos([0x1b, 0x64, 0x02])
    const cut = escpos([0x1d, 0x56, 0x00])
    const feed = escpos([0x0a, 0x0a, 0x0a])
    const sep = Buffer.from("════════════════════════════════\n")

    const parts: Buffer[] = [
      center,
      doubleH,
      bold,
      Buffer.from("MEDIBOT PX\n"),
      normal,
      sep,
    ]
    for (const line of header) {
      parts.push(Buffer.from(line + "\n"))
    }
    parts.push(sep, left)
    for (const line of body) {
      parts.push(Buffer.from(line + "\n"))
    }
    parts.push(feed, cut)

    await writePrintBytes(Buffer.concat(parts))
  } else {
    console.log("[printer] " + text.split("\n").join("\n[printer] "))
  }
}
