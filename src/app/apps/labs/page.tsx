"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { speak } from "@/lib/tts"
import { captureStillFrame } from "@/lib/camera-utils"

interface Interpretation {
  name: string
  value: string | number
  unit: string
  referenceLow?: number
  referenceHigh?: number
  status?: string
  note?: string
}

interface InterpretResult {
  summary?: string
  results?: Interpretation[]
  disclaimer?: boolean
  _source?: string
}

type ScanPhase = "idle" | "instruct" | "countdown" | "capturing" | "review" | "analyzing"

export default function LabsPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle")
  const [countdownNum, setCountdownNum] = useState(3)
  const [interpretation, setInterpretation] = useState<InterpretResult | null>(null)
  const [piCamera, setPiCamera] = useState<boolean | null>(null)

  useEffect(() => {
    setPiCamera(window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1")
  }, [])

  const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

  const startCamera = useCallback(async () => {
    if (piCamera) {
      setCameraOn(true)
      return
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      setStream(s)
      setCameraOn(true)
      if (videoRef.current) {
        videoRef.current.srcObject = s
      }
    } catch {
      console.warn("[labs] camera not available")
      setCameraOn(false)
    }
  }, [piCamera])

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
    setCameraOn(false)
  }, [stream])

  useEffect(() => {
    return () => { stream?.getTracks().forEach((t) => t.stop()) }
  }, [stream])

  const runCountdown = async () => {
    speak("Get ready. Three, two, one.")
    for (let n = 3; n >= 1; n--) {
      setCountdownNum(n)
      await pause(1000)
    }
  }

  const capturePhoto = useCallback(async (): Promise<string | null> => {
    if (piCamera) {
      setCameraOn(false)
      await pause(1500)
      try {
        await fetch("/api/camera/release", { method: "POST" })
      } catch {}
      await pause(2000)
      try {
        const base64 = await captureStillFrame("/api/camera/capture")
        return base64
      } catch {
        return null
      }
    } else {
      if (!videoRef.current || !canvasRef.current) return null
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext("2d")
      if (!ctx) return null
      ctx.drawImage(video, 0, 0)
      return canvas.toDataURL("image/jpeg", 0.8).split(",")[1]
    }
  }, [piCamera])

  const handleScan = async () => {
    if (scanPhase !== "idle") return
    setInterpretation(null)
    setCaptured(null)
    setScanPhase("instruct")
    console.log("[labs] scan: instructing user to place lab result")
    speak("Please place your lab result document in front of the camera, facing it directly.")
    await startCamera()
    await pause(3000)

    setScanPhase("countdown")
    console.log("[labs] scan: countdown started")
    await runCountdown()

    setScanPhase("capturing")
    console.log("[labs] scan: capturing photo...")
    speak("Capturing now.")
    const base64 = await capturePhoto()
    if (!base64) {
      console.error("[labs] scan: capture failed")
      setScanPhase("idle")
      speak("Capture failed. Please try again.")
      return
    }
    console.log("[labs] scan: photo captured, showing review")
    setCaptured(base64)
    setScanPhase("review")
    speak("Photo captured. Please review and submit or retake.")
  }

  const handleSubmit = async () => {
    if (!captured) return
    setScanPhase("analyzing")
    console.log("[labs] scan: submitting to Grok vision for analysis...")
    speak("Analyzing your lab results now.")
    try {
      const res = await fetch("/api/labs/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: captured }),
      })
      const data = await res.json()
      console.log("[labs] scan: analysis complete, results:", data.results?.length ?? 0, "items")
      setInterpretation(data)
      speak("Analysis complete. Here are your results.")
    } catch {
      console.error("[labs] scan: analysis failed")
      setInterpretation({ summary: "Failed to interpret lab results. Please try again." })
      speak("Analysis failed. Please try again.")
    } finally {
      setScanPhase("idle")
    }
  }

  const handleRetake = () => {
    console.log("[labs] scan: retaking photo")
    setCaptured(null)
    setInterpretation(null)
    setScanPhase("idle")
  }

  const statusColor: Record<string, string> = {
    normal: "text-success",
    high: "text-danger",
    low: "text-warning",
  }

  return (
    <div className="flex-1 flex flex-col p-3 md:p-4 gap-2 max-w-xl mx-auto w-full overflow-y-auto overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Lab Results</h2>
        <p className="text-xs text-gray-500">Scan and analyze lab results with AI</p>
      </div>

      {scanPhase === "idle" && !captured && (
        <Card padding="none" className="overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Camera</p>
          </div>
          <div className="p-3 flex flex-col items-center gap-2">
            <button onClick={handleScan}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors">
              Scan Lab Result
            </button>
            <p className="text-[11px] text-gray-400 text-center">Place your lab result in front of the robot camera</p>
          </div>
        </Card>
      )}

      {(scanPhase === "instruct" || scanPhase === "countdown" || scanPhase === "capturing") && (
        <Card padding="none" className="overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Camera</p>
          </div>
          <div className="p-3 flex flex-col items-center gap-2">
            {!piCamera && (
              <video ref={videoRef} autoPlay playsInline muted
                className="w-full rounded-xl bg-black" />
            )}
            {piCamera && (
              <div className="w-full rounded-xl bg-black flex items-center justify-center h-48">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                </svg>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
            {scanPhase === "instruct" && (
              <div className="w-full rounded-xl bg-amber-50 border border-amber-300 p-3 text-center">
                <p className="text-sm font-bold text-amber-900">Place the lab result document in front of the camera</p>
                <p className="text-xs text-amber-700 mt-1">Facing it directly, make sure all text is visible...</p>
              </div>
            )}
            {scanPhase === "countdown" && (
              <div className="w-full rounded-xl bg-primary/10 border border-primary/30 p-3 text-center">
                <p className="text-3xl font-bold text-primary">{countdownNum}</p>
                <p className="text-xs text-primary/70 mt-1">Hold still...</p>
              </div>
            )}
            {scanPhase === "capturing" && (
              <div className="w-full rounded-xl bg-gray-100 p-3 text-center">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-xs text-gray-500 mt-1">Capturing...</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {scanPhase === "review" && captured && (
        <Card padding="none" className="overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Review Captured Image</p>
          </div>
          <div className="p-3 flex flex-col gap-2">
            <img src={`data:image/jpeg;base64,${captured}`} alt="Captured lab result"
              className="w-full rounded-xl" />
            <div className="flex gap-2">
              <button onClick={handleSubmit}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors">
                Submit for Analysis
              </button>
              <button onClick={handleRetake}
                className="flex-1 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                Retake
              </button>
            </div>
          </div>
        </Card>
      )}

      {scanPhase === "analyzing" && (
        <Card padding="md" className="text-center py-2">
          <div className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">AI is analyzing your lab results...</p>
          </div>
        </Card>
      )}

      {interpretation && (
        <Card padding="none" className="overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Interpretation</p>
          </div>
          <div className="overflow-x-auto">
            {interpretation.results && interpretation.results.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                    <th className="px-3 py-1.5 font-medium">Name</th>
                    <th className="px-3 py-1.5 font-medium text-right">Value</th>
                    <th className="px-3 py-1.5 font-medium text-right">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {interpretation.results.map((r, i) => (
                    <tr key={i} className="border-t border-gray-50 dark:border-gray-800/60">
                      <td className="px-3 py-1.5 text-gray-600 dark:text-gray-300">{r.name}</td>
                      <td className={`px-3 py-1.5 text-right font-medium ${r.status ? statusColor[r.status] || "text-foreground" : "text-foreground"}`}>
                        {r.value} {r.unit}
                      </td>
                      <td className="px-3 py-1.5 text-right text-gray-400 whitespace-nowrap">
                        {r.referenceLow != null && r.referenceHigh != null
                          ? `${r.referenceLow}–${r.referenceHigh} ${r.unit}`
                          : r.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {interpretation.summary && (
            <div className="px-3 pb-3">
              <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5">
                {interpretation.summary}
              </p>
            </div>
          )}
          <div className="px-3 pb-3">
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <span>⚕️</span>
              <p>I&apos;m an AI assistant, not a doctor. This information is for reference only. Please consult a qualified healthcare professional for proper diagnosis and treatment.</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
