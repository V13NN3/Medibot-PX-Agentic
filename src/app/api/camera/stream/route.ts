import { NextRequest } from "next/server"
import { spawn, ChildProcess } from "child_process"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isRpi(): boolean {
  return process.platform === "linux" && process.arch === "arm64"
}

const enc = new TextEncoder()

function findSOI(buf: Buffer): number {
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 0xff && buf[i + 1] === 0xd8) return i
  }
  return -1
}

function findEOI(buf: Buffer, from: number): number {
  for (let i = from; i < buf.length - 1; i++) {
    if (buf[i] === 0xff && buf[i + 1] === 0xd9) return i
  }
  return -1
}

export async function GET(req: NextRequest) {
  if (!isRpi()) {
    return new Response(JSON.stringify({ error: "Camera not available (not on Raspberry Pi)" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }

  const boundary = "frame"
  let proc: ChildProcess | null = null

  const stream = new ReadableStream({
    start(controller) {
      proc = spawn("rpicam-vid", [
        "--codec", "mjpeg",
        "-t", "0",
        "--width", "1280",
        "--height", "720",
        "-o", "-",
      ], { stdio: ["ignore", "pipe", "pipe"] })

      let buf = Buffer.alloc(0)

      proc.stdout!.on("data", (chunk: Buffer) => {
        buf = Buffer.concat([buf, chunk])

        while (buf.length > 1) {
          const start = findSOI(buf)
          if (start === -1) { buf = Buffer.alloc(0); return }

          const end = findEOI(buf, start + 2)
          if (end === -1) return

          const frame = buf.subarray(start, end + 2)
          buf = buf.subarray(end + 2)

          try {
            controller.enqueue(enc.encode(`--${boundary}\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`))
            controller.enqueue(new Uint8Array(frame))
            controller.enqueue(enc.encode("\r\n"))
          } catch {
            return
          }
        }
      })

      proc.stderr?.on("data", (d: Buffer) => {
        const msg = d.toString().trim()
        if (msg.includes("ERROR") || msg.includes("error") || msg.includes("No camera")) {
          console.error("[camera/stream]", msg)
        }
      })

      proc.on("close", () => {
        try {
          controller.enqueue(enc.encode(`--${boundary}--\r\n`))
          controller.close()
        } catch {}
      })

      proc.on("error", (err) => {
        console.error("[camera/stream] spawn error:", err.message)
        try { controller.close() } catch {}
      })
    },
    cancel() {
      if (proc && !proc.killed) {
        proc.kill("SIGTERM")
        setTimeout(() => { if (proc && !proc.killed) proc.kill("SIGKILL") }, 2000)
      }
    },
  })

  req.signal.addEventListener("abort", () => {
    if (proc && !proc.killed) proc.kill("SIGTERM")
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": `multipart/x-mixed-replace; boundary=${boundary}`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Accel-Buffering": "no",
    },
  })
}
