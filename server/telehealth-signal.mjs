import { WebSocketServer } from "ws"
import WebSocket from "ws"
import { randomUUID } from "crypto"

const PORT = parseInt(process.env.TELEHEALTH_PORT || "3004", 10)

const wss = new WebSocketServer({ host: "0.0.0.0", port: PORT })

console.log(`[telehealth-signal] WebSocket signaling listening on ws://0.0.0.0:${PORT}`)

const doctors = new Map() // doctorId -> ws
const doctorNames = new Map() // doctorId -> name
const calls = new Map() // callId -> { kiosk: ws, doctor: ws, doctorId }

function send(ws, msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
  }
}

wss.on("connection", (ws) => {
  console.log("[telehealth-signal] client connected")

  ws.on("message", (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }

    switch (msg.type) {
      case "register": {
        const doctorId = String(msg.doctorId || "").trim()
        const name = String(msg.name || "").trim()
        if (!doctorId) {
          send(ws, { type: "error", message: "Missing doctorId" })
          return
        }
        doctors.set(doctorId, ws)
        doctorNames.set(doctorId, name || doctorId)
        ws.doctorId = doctorId
        console.log(`[telehealth-signal] doctor online: ${name || doctorId}`)
        send(ws, { type: "registered", doctorId, name: name || doctorId })
        break
      }

      case "call": {
        const doctorId = String(msg.doctorId || "").trim()
        const patientName = String(msg.patientName || "").trim()
        if (!doctorId) {
          send(ws, { type: "error", message: "Missing doctorId" })
          return
        }
        const doctorWs = doctors.get(doctorId)
        if (!doctorWs || doctorWs.readyState !== WebSocket.OPEN) {
          send(ws, { type: "doctor-offline", doctorId })
          return
        }
        const callId = randomUUID()
        calls.set(callId, { kiosk: ws, doctor: doctorWs, doctorId })
        ws.callId = callId
        doctorWs.callId = callId
        console.log(`[telehealth-signal] call ${callId} → ${doctorNames.get(doctorId)}`)
        send(doctorWs, { type: "incoming-call", callId, patientName: patientName || "" })
        send(ws, { type: "call-initiated", callId, doctorId })
        break
      }

      case "accept": {
        const call = calls.get(msg.callId)
        if (!call) return
        console.log(`[telehealth-signal] call ${msg.callId} accepted`)
        send(call.kiosk, { type: "call-accepted", callId: msg.callId })
        break
      }

      case "decline": {
        const call = calls.get(msg.callId)
        if (!call) return
        console.log(`[telehealth-signal] call ${msg.callId} declined`)
        send(call.kiosk, { type: "call-declined", callId: msg.callId })
        if (call.kiosk.callId === msg.callId) call.kiosk.callId = null
        if (call.doctor.callId === msg.callId) call.doctor.callId = null
        calls.delete(msg.callId)
        break
      }

      case "cancel": {
        const call = calls.get(msg.callId)
        if (!call) return
        console.log(`[telehealth-signal] call ${msg.callId} cancelled`)
        if (call.doctor.callId === msg.callId) call.doctor.callId = null
        send(call.doctor, { type: "call-cancelled", callId: msg.callId })
        calls.delete(msg.callId)
        break
      }

      case "offer":
      case "answer": {
        const call = calls.get(msg.callId)
        if (!call) return
        const target = ws === call.kiosk ? call.doctor : call.kiosk
        send(target, { type: msg.type, callId: msg.callId, sdp: msg.sdp })
        break
      }

      case "ice": {
        const call = calls.get(msg.callId)
        if (!call) return
        const target = ws === call.kiosk ? call.doctor : call.kiosk
        send(target, { type: "ice", callId: msg.callId, candidate: msg.candidate })
        break
      }

      case "end-call": {
        const call = calls.get(msg.callId)
        if (!call) return
        const target = ws === call.kiosk ? call.doctor : call.kiosk
        send(target, { type: "peer-ended", callId: msg.callId })
        if (call.kiosk.callId === msg.callId) call.kiosk.callId = null
        if (call.doctor.callId === msg.callId) call.doctor.callId = null
        calls.delete(msg.callId)
        break
      }

      default:
        break
    }
  })

  ws.on("close", () => {
    if (ws.doctorId) {
      doctors.delete(ws.doctorId)
      console.log(`[telehealth-signal] doctor offline: ${doctorNames.get(ws.doctorId) || ws.doctorId}`)
    }
    if (ws.callId) {
      const call = calls.get(ws.callId)
      if (call) {
        const other = ws === call.kiosk ? call.doctor : call.kiosk
        send(other, { type: "peer-ended", callId: ws.callId })
        if (other.callId === ws.callId) other.callId = null
        calls.delete(ws.callId)
      }
      ws.callId = null
    }
    console.log("[telehealth-signal] client disconnected")
  })

  ws.on("error", (err) => {
    console.error("[telehealth-signal] client error:", err.message)
  })
})

wss.on("error", (err) => {
  console.error("[telehealth-signal] server error:", err.message)
})
