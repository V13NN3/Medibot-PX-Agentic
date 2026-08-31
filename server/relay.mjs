import { WebSocketServer } from "ws"
import WebSocket from "ws"
import { pathToFileURL } from "url"

const RELAY_PORT = parseInt(process.env.RELAY_PORT || "3002", 10)
const GROK_URL = process.env.GROK_VOICE_API_URL || "wss://api.x.ai/v1/realtime"
const GROK_KEY = process.env.GROK_VOICE_API_KEY || ""

export const relayIsMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

export function handleRelayConnection(clientWs) {
  console.log("[relay] browser connected")

  if (!GROK_KEY) {
    console.error("[relay] GROK_VOICE_API_KEY is not set")
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
    try {
      const msg = JSON.parse(str)
      if (msg.type !== "input_audio_buffer.append" && msg.type !== "response.output_audio.delta") {
        console.log("[relay] Grok → browser:", msg.type)
      }
      if (msg.type === "response.function_call_arguments.done") {
        console.log("[relay] FUNCTION_CALL DONE PAYLOAD:", JSON.stringify({ call_id: msg.call_id, function_name: msg.function_name, name: msg.name, arguments: msg.arguments, output: msg.output, item: msg.item }))
      }
      if (msg.type === "response.output_item.added") {
        console.log("[relay] OUTPUT_ITEM_ADDED:", JSON.stringify({ type: msg.item?.type, name: msg.item?.name, call_id: msg.item?.call_id }))
      }
      if (msg.type === "ping") {
        grokWs.send(JSON.stringify({ type: "pong" }))
      }
      if (msg.type === "error") {
        console.error("[relay] Grok error:", JSON.stringify(msg.error))
      }
    } catch {
      /* ignore parse errors */
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
    try {
      const str = raw.toString()
      const msg = JSON.parse(str)
      if (msg.type !== "input_audio_buffer.append") {
        console.log("[relay] browser → Grok:", msg.type)
      }
      if (connected && grokWs.readyState === WebSocket.OPEN) {
        grokWs.send(str)
      }
    } catch {
      /* ignore parse errors */
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
}

export function startRelayServer() {
  const wss = new WebSocketServer({ host: "0.0.0.0", port: RELAY_PORT })

  console.log(`[relay] WebSocket relay listening on ws://0.0.0.0:${RELAY_PORT}`)

  wss.on("connection", handleRelayConnection)

  wss.on("error", (err) => {
    console.error("[relay] server error:", err.message)
  })
}

const isMain = relayIsMain
if (isMain) {
  startRelayServer()
}
