import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export const runtime = "nodejs"

function isRpi(): boolean {
  return process.platform === "linux" && process.arch === "arm64"
}

export async function POST() {
  if (!isRpi()) {
    return new Response(JSON.stringify({ ok: true, message: "Not on Pi, nothing to release" }), {
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    await execAsync("pkill -9 rpicam-vid || true", { timeout: 5000 })
    await execAsync("pkill -9 libcamera-vid || true", { timeout: 5000 })
    await new Promise((r) => setTimeout(r, 500))
    console.log("[camera/release] killed rpicam-vid/libcamera-vid")
  } catch {
    // processes may not exist, that's fine
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  })
}
