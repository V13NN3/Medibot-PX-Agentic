import { createServer } from "https"
import { readFileSync, existsSync, mkdirSync } from "fs"
import { execFileSync } from "child_process"
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
const CERT_CN = process.env.CERT_CN || process.env.HOSTNAME || "medibot-px"
const PI_IP = process.env.PI_IP || ""

function certMatchesConfig() {
  if (!existsSync(CERT_PATH) || !existsSync(KEY_PATH)) return false
  try {
    const want = [`CN = ${CERT_CN}`, `CN=${CERT_CN}`]
    const out = execFileSync("openssl", ["x509", "-in", CERT_PATH, "-noout", "-text"]).toString()
    if (!want.some((w) => out.includes(w))) return false
    if (PI_IP && !out.includes(`IP Address:${PI_IP}`)) return false
    return true
  } catch {
    return false
  }
}

function ensureCerts() {
  if (certMatchesConfig()) return
  console.log("[https] TLS cert missing or CN/SAN out of date — regenerating...")
  mkdirSync(path.dirname(CERT_PATH), { recursive: true })
  const san = ["DNS:localhost", "IP:127.0.0.1", "IP:0.0.0.0"]
  if (PI_IP) san.push(`IP:${PI_IP}`)
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-sha256", "-days", "825", "-nodes",
    "-keyout", KEY_PATH, "-out", CERT_PATH,
    "-subj", `/CN=${CERT_CN}`,
    "-addext", `subjectAltName=${san.join(",")}`,
  ], { stdio: "inherit" })
  console.log(`[https] cert written to ${CERT_PATH}`)
}

const app = next({ dev: DEV, hostname: "0.0.0.0", port: HTTPS_PORT })
const handle = app.getRequestHandler()

const relayWss = new WebSocketServer({ noServer: true })
const signalWss = new WebSocketServer({ noServer: true })

relayWss.on("connection", handleRelayConnection)
signalWss.on("connection", handleSignalConnection)

app.prepare().then(() => {
  ensureCerts()

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

    const nextUpgrade = app.getUpgradeHandler?.()
    if (nextUpgrade) {
      nextUpgrade(req, socket, head)
    } else {
      socket.destroy()
    }
  })

  server.listen(HTTPS_PORT, "0.0.0.0", () => {
    console.log(`[https] Medibot PX secure server listening on https://0.0.0.0:${HTTPS_PORT}`)
    console.log(`[https] voice relay WSS  : wss://<host>:${HTTPS_PORT}/relay`)
    console.log(`[https] telehealth signal: wss://<host>:${HTTPS_PORT}/signal`)
  })
})
