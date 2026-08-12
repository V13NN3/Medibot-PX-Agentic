"use client"

import { useSearchParams } from "next/navigation"
import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { Card } from "@/components/ui/card"

interface Doctor {
  id: string
  name: string
  specialty: string
  available: boolean
}

type CallState = "idle" | "initiating" | "ringing" | "declined" | "connected" | "offline" | "ended"

const SIGNAL_URL =
  process.env.NEXT_PUBLIC_TELEHEALTH_URL ||
  (typeof window !== "undefined"
    ? `ws://${window.location.hostname}:3004`
    : "ws://localhost:3004")

function TelehealthInner() {
  const searchParams = useSearchParams()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [target, setTarget] = useState<Doctor | null>(null)
  const [callState, setCallState] = useState<CallState>("idle")
  const [error, setError] = useState("")

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const callIdRef = useRef("")
  const mutedRef = useRef(false)
  const camOnRef = useRef(true)

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch("/api/doctors/search?q=")
      const data = await res.json()
      setDoctors((data.doctors || []).filter((d: Doctor) => d.available))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    fetchDoctors()
  }, [fetchDoctors])

  useEffect(() => {
    const search = searchParams.get("search")
    if (search) {
      const found = doctors.find((d) => d.name.toLowerCase().includes(search.toLowerCase()))
      if (found) setTarget(found)
    }
  }, [searchParams, doctors])

  const cleanup = useCallback(() => {
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    if (wsRef.current) {
      wsRef.current.onmessage = null
      wsRef.current.close()
      wsRef.current = null
    }
    callIdRef.current = ""
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
  }, [])

  const hangup = useCallback(() => {
    const callId = callIdRef.current
    if (wsRef.current && callId) {
      wsRef.current.send(JSON.stringify({ type: "end-call", callId }))
    }
    cleanup()
    setCallState("idle")
    setTarget(null)
  }, [cleanup])

  const startCall = useCallback(async (doctor: Doctor) => {
    setError("")
    setTarget(doctor)
    setCallState("initiating")

    const ws = new WebSocket(SIGNAL_URL)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "call", doctorId: doctor.id }))
    }

    ws.onmessage = async (e) => {
      const msg = JSON.parse(e.data)

      if (msg.type === "call-initiated") {
        callIdRef.current = msg.callId
        setCallState("ringing")
      }

      if (msg.type === "doctor-offline") {
        setCallState("offline")
        cleanup()
      }

      if (msg.type === "call-declined") {
        setCallState("declined")
        cleanup()
        setTimeout(() => {
          setCallState("idle")
          setTarget(null)
        }, 4000)
      }

      if (msg.type === "call-accepted") {
        callIdRef.current = msg.callId
        setCallState("connected")
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true,
          })
          localStreamRef.current = stream
          if (localVideoRef.current) localVideoRef.current.srcObject = stream

          const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          })
          pcRef.current = pc

          stream.getTracks().forEach((track) => pc.addTrack(track, stream))

          pc.onicecandidate = (ev) => {
            if (ev.candidate && wsRef.current) {
              wsRef.current.send(JSON.stringify({ type: "ice", callId: callIdRef.current, candidate: ev.candidate.toJSON() }))
            }
          }

          pc.ontrack = (ev) => {
            if (remoteVideoRef.current && ev.streams[0]) {
              remoteVideoRef.current.srcObject = ev.streams[0]
            }
          }

          pc.onconnectionstatechange = () => {
            if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
              hangup()
            }
          }

          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          ws.send(JSON.stringify({ type: "offer", callId: callIdRef.current, sdp: pc.localDescription }))
        } catch {
          setError("Camera/microphone unavailable")
          hangup()
        }
      }

      if (msg.type === "answer" && pcRef.current) {
        await pcRef.current.setRemoteDescription(msg.sdp)
      }

      if (msg.type === "ice" && pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(msg.candidate)
        } catch {
          /* ignore */
        }
      }

      if (msg.type === "peer-ended") {
        cleanup()
        setCallState("ended")
        setTimeout(() => {
          setCallState("idle")
          setTarget(null)
        }, 3000)
      }
    }

    ws.onclose = () => {
      if (callState === "ringing" || callState === "connected") {
        cleanup()
        setCallState("ended")
      }
    }
  }, [cleanup, hangup])

  const toggleMute = () => {
    mutedRef.current = !mutedRef.current
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !mutedRef.current
    })
  }

  const toggleCam = () => {
    camOnRef.current = !camOnRef.current
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = camOnRef.current
    })
  }

  if (callState === "connected") {
    return (
      <div className="flex-1 flex flex-col p-4 gap-4 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">In Call</h2>
            <p className="text-sm text-gray-500">{target?.name}</p>
          </div>
          <button onClick={hangup}
            className="px-5 py-2.5 rounded-xl bg-danger text-white text-sm font-bold hover:bg-red-600 transition-colors">
            End Call
          </button>
        </div>

        <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
          <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-contain" />
          <div className="absolute bottom-3 left-3 w-36 h-24 rounded-xl overflow-hidden border border-white/30 shadow-lg">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
          <div className="absolute top-3 right-3 flex gap-2">
            <button onClick={toggleMute}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur text-white text-lg hover:bg-white/30 transition-colors">
              {mutedRef.current ? "🔇" : "🎙️"}
            </button>
            <button onClick={toggleCam}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur text-white text-lg hover:bg-white/30 transition-colors">
              {camOnRef.current ? "🎥" : "🚫"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 max-w-2xl mx-auto w-full">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Telehealth</h2>
        <p className="text-sm text-gray-500">Video call with your doctor</p>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {callState === "ringing" && target && (
        <Card padding="md" className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="text-5xl animate-pulse">📞</span>
          <p className="text-lg font-semibold text-foreground">Calling {target.name}...</p>
          <p className="text-sm text-gray-500">Waiting for the doctor to answer</p>
          <button onClick={hangup}
            className="px-5 py-2.5 rounded-xl bg-danger text-white text-sm font-bold hover:bg-red-600 transition-colors">
            Cancel
          </button>
        </Card>
      )}

      {callState === "offline" && (
        <Card padding="md" className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-3xl">🛑</p>
          <p className="text-lg font-semibold text-foreground">Doctor is not available</p>
          <p className="text-sm text-gray-500">Please try again later or see the front desk.</p>
          <button onClick={() => { setCallState("idle"); setTarget(null) }}
            className="mt-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold">
            Back
          </button>
        </Card>
      )}

      {callState === "declined" && (
        <Card padding="md" className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-3xl">😕</p>
          <p className="text-lg font-semibold text-foreground">Call declined</p>
        </Card>
      )}

      {callState === "ended" && (
        <Card padding="md" className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-3xl">📴</p>
          <p className="text-lg font-semibold text-foreground">Call ended</p>
        </Card>
      )}

      {callState === "idle" && (
        <>
          <p className="text-sm text-gray-500">Select a doctor to start a video call.</p>
          <div className="flex flex-col gap-3">
            {doctors.map((d) => (
              <Card key={d.id} padding="md" className="flex items-center gap-4">
                <span className="w-12 h-12 rounded-full bg-primary/10 text-primary text-base font-semibold flex items-center justify-center shrink-0">
                  {d.name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{d.name}</p>
                  <p className="text-xs text-gray-500">{d.specialty}</p>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] text-success shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  Available
                </span>
                <button onClick={() => startCall(d)}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors shrink-0">
                  Call
                </button>
              </Card>
            ))}
            {doctors.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No available doctors right now.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function TelehealthPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <TelehealthInner />
    </Suspense>
  )
}
