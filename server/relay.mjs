import { WebSocketServer } from "ws"
import WebSocket from "ws"

const RELAY_PORT = parseInt(process.env.RELAY_PORT || "3002", 10)
const GROK_URL = process.env.GROK_VOICE_API_URL || "wss://api.x.ai/v1/realtime"
const GROK_KEY = process.env.GROK_VOICE_API_KEY || ""

const wss = new WebSocketServer({ host: "127.0.0.1", port: RELAY_PORT })

console.log(`[relay] WebSocket relay listening on ws://127.0.0.1:${RELAY_PORT}`)

wss.on("connection", (clientWs) => {
  console.log("[relay] browser connected")

  if (!GROK_KEY) {
    clientWs.send(JSON.stringify({ type: "error", message: "GROK_VOICE_API_KEY is not set" }))
    clientWs.close()
    return
  }

  const grokWs = new WebSocket(GROK_URL, {
    headers: { Authorization: `Bearer ${GROK_KEY}` },
  })
  let connected = false

  grokWs.on("open", () => {
    console.log("[relay] connected to Grok API")
    connected = true
  })

  grokWs.on("message", (raw) => {
    const str = raw.toString()
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(str)
    }
    const msg = JSON.parse(str)
    if (msg.type === "ping") {
      grokWs.send(JSON.stringify({ type: "pong" }))
    }
  })

  grokWs.on("error", (err) => {
    console.error("[relay] Grok WS error:", err.message)
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: "error", message: err.message }))
    }
  })

  grokWs.on("close", (code, reason) => {
    console.log(`[relay] Grok WS closed: ${code} ${reason}`)
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close()
    }
  })

  clientWs.on("message", (raw) => {
    if (connected && grokWs.readyState === WebSocket.OPEN) {
      grokWs.send(raw.toString())
    }
  })

  clientWs.on("close", () => {
    console.log("[relay] browser disconnected")
    if (grokWs.readyState === WebSocket.OPEN || grokWs.readyState === WebSocket.CONNECTING) {
      grokWs.close()
    }
  })

  clientWs.on("error", (err) => {
    console.error("[relay] client WS error:", err.message)
  })
})

wss.on("error", (err) => {
  console.error("[relay] server error:", err.message)
})
