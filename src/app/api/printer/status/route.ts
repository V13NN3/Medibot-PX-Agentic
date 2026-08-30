import { NextResponse } from "next/server"

export const runtime = "nodejs"

async function resolvePrinterTarget(): Promise<{ device: string; kind: string } | null> {
  const fs = await import("fs")
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

export async function GET() {
  try {
    const target = await resolvePrinterTarget()
    if (!target) {
      return NextResponse.json({ ready: false, error: "No printer device found" })
    }
    return NextResponse.json({ ready: true, device: target.device, kind: target.kind })
  } catch (err) {
    return NextResponse.json({ ready: false, error: String(err) })
  }
}
