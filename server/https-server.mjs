import { createServer } from "https"
import { readFileSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { WebSocketServer } from "ws"
import next from "next"
import { handleRelayConnection } from "./relay.mjs"
import { handleSignalConnection } from "./telehealth-signal.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || "3000", 10)
const CERT_DIR = process.env.CERT_DIR || path.join(__dirname, "..", "certs")
const CERT_PATH = process.env.TLS_CERT || path.join(CERT_DIR, "cert.pem")
const KEY_PATH = process.env.TLS_KEY || path.join(CERT_DIR, "key.pem")
const DEV = process.env.NODE_ENV !== "production"

const app = next({ dev: DEV, hostname: "0.0.0.0", port: HTTPS_PORT })
const handle = app.getRequestHandler()

const relayWss = new WebSocketServer({ noServer: true })
const signalWss = new WebSocketServer({ noServer: true })

relayWss.on("connection", handleRelayConnection)
signalWss.on("connection", handleSignalConnection)

app.prepare().then(() => {
  const server = createServer(
    {
      cert: readFileSync(CERT_PATH),
      key: readFileSync(KEY_PATH),
    },
    (req, res) => {
      handle(req, res)
    }
  )

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = new URL(req.url, "https://localhost")

    if (pathname === "/relay") {
      relayWss.handleUpgrade(req, socket, head, (ws) => {
        relayWss.emit("connection", ws, req)
      })
      return
    }

    if (pathname === "/signal") {
      signalWss.handleUpgrade(req, socket, head, (ws) => {
        signalWss.emit("connection", ws, req)
      })
      return
    }

    socket.destroy()
  })

  server.listen(HTTPS_PORT, "0.0.0.0", () => {
    console.log(`[https] Medibot PX secure server listening on https://0.0.0.0:${HTTPS_PORT}`)
    console.log(`[https] voice relay WSS  : wss://<host>:${HTTPS_PORT}/relay`)
    console.log(`[https] telehealth signal: wss://<host>:${HTTPS_PORT}/signal`)
  })
})
