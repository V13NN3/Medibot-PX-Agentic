"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { analysisRows } from "@/lib/mock-labs"
import { getRangeStatus } from "@/lib/utils"
import { fetchStreamFrame } from "@/lib/camera-utils"

interface Interpretation {
  name: string
  value: string | number
  unit: string
  status?: string
  note?: string
}

interface InterpretResult {
  summary?: string
  results?: Interpretation[]
  disclaimer?: boolean
  _source?: string
}

interface UploadedLab {
  id: string
  file_name: string
  file_url: string
  notes?: string
  uploaded_at: string
}

export default function LabsPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [uploadedLabs, setUploadedLabs] = useState<UploadedLab[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [interpreting, setInterpreting] = useState(false)
  const [interpretation, setInterpretation] = useState<InterpretResult | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [piCamera, setPiCamera] = useState<boolean | null>(null)
  const piStreamImgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setPiCamera(window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1")
  }, [])

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

  useEffect(() => {
    fetch("/api/appointments/list")
      .then((r) => r.json())
      .then((data) => {
        if (data.appointments) {
          setUploadedLabs([])
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = () => capturePhoto()
    window.addEventListener("capture-lab-photo", handler)
    return () => window.removeEventListener("capture-lab-photo", handler)
  })

  const capturePhoto = useCallback(async () => {
    setCapturing(true)

    let base64: string

    if (piCamera) {
      try {
        base64 = await fetchStreamFrame("/api/camera/stream")
      } catch {
        setCapturing(false)
        return
      }
    } else {
      if (!videoRef.current || !canvasRef.current) { setCapturing(false); return }
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext("2d")
      if (!ctx) { setCapturing(false); return }
      ctx.drawImage(video, 0, 0)
      base64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1]
    }

    setCaptured(base64)
    setCapturing(false)

    await fetch("/api/labs/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_base64: base64 }),
    })

    setInterpreting(true)
    try {
      const res = await fetch("/api/labs/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64 }),
      })
      const data = await res.json()
      setInterpretation(data)
    } catch {
      setInterpretation({ summary: "Failed to interpret image." })
    } finally {
      setInterpreting(false)
    }
  }, [piCamera])

  const outOfRange = analysisRows.filter(
    (row) => getRangeStatus(row.value, row.referenceLow, row.referenceHigh) === "danger",
  ).length

  const statusColor = {
    normal: "text-success",
    high: "text-danger",
    low: "text-warning",
  }

  return (
    <div className="flex-1 flex flex-col p-3 md:p-4 gap-2 max-w-xl mx-auto w-full overflow-y-auto overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Lab Results</h2>
        <p className="text-xs text-gray-500">View X-rays, blood tests, and other lab results</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
          Panel: Basic Metabolic
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
          {outOfRange > 0 ? `${outOfRange} out of range` : "All in range"}
        </span>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Camera</p>
        </div>
        <div className="p-3 flex flex-col items-center gap-2">
          {!cameraOn ? (
            <button onClick={startCamera}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors">
              Open Camera
            </button>
          ) : (
            <>
              {piCamera ? (
                <img ref={piStreamImgRef} src="/api/camera/stream" alt="Pi camera" className="w-full rounded-xl bg-black" />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted
                  className="w-full rounded-xl bg-black" />
              )}
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2 w-full">
                <button onClick={capturePhoto} disabled={capturing || interpreting}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:bg-gray-300">
                  {capturing ? "Capturing..." : "📸 Capture Photo"}
                </button>
                <button onClick={stopCamera}
                  className="px-4 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </Card>

      {captured && (
        <Card padding="none" className="overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Captured Image</p>
          </div>
          <div className="p-3">
            <img src={`data:image/jpeg;base64,${captured}`} alt="Captured lab result"
              className="w-full rounded-xl" />
          </div>
        </Card>
      )}

      <Card padding="none" className="overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Analysis Results</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-3 py-1.5 font-medium">Name</th>
                <th className="px-3 py-1.5 font-medium text-right">Value</th>
                <th className="px-3 py-1.5 font-medium text-right">Reference</th>
              </tr>
            </thead>
            <tbody>
              {analysisRows.map((row) => {
                const status = getRangeStatus(row.value, row.referenceLow, row.referenceHigh)
                return (
                  <tr key={row.id} className="border-t border-gray-50 dark:border-gray-800/60">
                    <td className="px-3 py-1.5 text-gray-600 dark:text-gray-300">{row.name}</td>
                    <td className={`px-3 py-1.5 text-right font-medium ${status === "normal" ? "text-foreground" : status === "warning" ? "text-warning" : "text-danger"}`}>
                      {row.value} {row.unit}
                    </td>
                    <td className="px-3 py-1.5 text-right text-gray-400 whitespace-nowrap">
                      {row.referenceLow}&ndash;{row.referenceHigh} {row.unit}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {interpreting && (
        <Card padding="md" className="text-center py-2">
          <p className="text-sm text-gray-500">AI is analyzing your lab results...</p>
        </Card>
      )}

      {interpretation && (
        <Card padding="md" className="flex flex-col gap-2 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Interpretation</p>

          {interpretation.results && interpretation.results.length > 0 && (
            <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {interpretation.results.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{r.name}</span>
                  <span className={`font-medium ${r.status ? statusColor[r.status as keyof typeof statusColor] || "text-foreground" : "text-foreground"}`}>
                    {r.value} {r.unit}
                  </span>
                </div>
              ))}
            </div>
          )}

          {interpretation.summary && (
            <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5">
              {interpretation.summary}
            </p>
          )}

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
            <span>⚕️</span>
            <p>I&apos;m an AI assistant, not a doctor. This information is for reference only. Please consult a qualified healthcare professional for proper diagnosis and treatment.</p>
          </div>
        </Card>
      )}
    </div>
  )
}
