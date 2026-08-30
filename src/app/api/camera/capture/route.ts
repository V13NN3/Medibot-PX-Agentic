import { execFile } from "child_process"
import { promisify } from "util"
import { existsSync, readFileSync, unlinkSync } from "fs"
import path from "path"

const execFileAsync = promisify(execFile)

export const runtime = "nodejs"

function isRpi(): boolean {
  return process.platform === "linux" && process.arch === "arm64"
}

export async function GET() {
  if (!isRpi()) {
    return new Response(JSON.stringify({ error: "Camera not available (not on Raspberry Pi)" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }

  const out = path.join("/tmp", `capture-${Date.now()}.jpg`)
  const width = 1296
  const height = 972

  const candidates: Array<[string, string[]]> = [
    ["rpicam-still", ["-o", out, "-n", "--width", String(width), "--height", String(height), "--timeout", "2500"]],
    ["libcamera-still", ["-o", out, "-n", "--width", String(width), "--height", String(height), "--timeout", "2500"]],
  ]

  for (const [cmd, args] of candidates) {
    try {
      await execFileAsync(cmd, args, { timeout: 10000 })
      if (existsSync(out)) {
        const buf = readFileSync(out)
        try { unlinkSync(out) } catch {}
        console.log(`[camera/capture] captured ${buf.length} bytes`)
        return new Response(buf, {
          headers: {
            "Content-Type": "image/jpeg",
            "Content-Length": String(buf.length),
            "Cache-Control": "no-store",
          },
        })
      }
    } catch (err) {
      console.warn(`[camera/capture] ${cmd} failed:`, err instanceof Error ? err.message : err)
    }
  }

  return new Response(JSON.stringify({ error: "Capture failed" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  })
}
