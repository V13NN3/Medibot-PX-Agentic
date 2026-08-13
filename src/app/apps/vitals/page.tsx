"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useState, useEffect, Suspense, useCallback } from "react"
import { Card } from "@/components/ui/card"

interface Reading {
  weight_kg: number
  height_cm: number
  temperature_c: number
  oxygen_saturation: number
  heart_rate: number
  _source?: string
  image_base64?: string
}

const MEASUREMENTS = [
  { key: "weight", label: "Weight", unit: "kg", icon: "⚖️", fmt: (r: Reading) => `${r.weight_kg.toFixed(1)}` },
  { key: "height", label: "Height", unit: "cm", icon: "📏", fmt: (r: Reading) => `${r.height_cm.toFixed(0)}` },
  { key: "temperature", label: "Temperature", unit: "°C", icon: "🌡️", fmt: (r: Reading) => `${r.temperature_c.toFixed(1)}` },
  { key: "oxygen", label: "O₂", unit: "%", icon: "🫁", fmt: (r: Reading) => `${r.oxygen_saturation.toFixed(0)}` },
  { key: "heart_rate", label: "Heart Rate", unit: "bpm", icon: "💓", fmt: (r: Reading) => `${r.heart_rate.toFixed(0)}` },
] as const

function VitalsInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const patientId = searchParams.get("patientId")

  const [reading, setReading] = useState<Reading | null>(null)
  const [measuring, setMeasuring] = useState<string[]>([])
  const [heightPhase, setHeightPhase] = useState<"idle" | "instruct" | "measuring">("idle")
  const [heightImg, setHeightImg] = useState("")
  const [heightErr, setHeightErr] = useState("")
  const [saving, setSaving] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [printMsg, setPrintMsg] = useState("")
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const reveal = useCallback((r: Reading) => {
    setReading(r)
    setMeasuring([])
  }, [])

  const startMeasurement = async () => {
    setError("")
    setMeasuring(MEASUREMENTS.map((m) => m.key))
    try {
      const res = await fetch("/api/vitals/read")
      const data = await res.json()
      await new Promise((r) => setTimeout(r, 1200))
      reveal(data)
    } catch {
      setMeasuring([])
      setError("Failed to read sensors")
    }
  }

  const measureHeight = async () => {
    setHeightErr("")
    setHeightImg("")
    setHeightPhase("instruct")
    await new Promise((r) => setTimeout(r, 2500))
    setHeightPhase("measuring")
    try {
      const res = await fetch("/api/vitals/height", { method: "POST" })
      const data = await res.json()
      if (data.height_cm) {
        setReading((prev) => ({ ...(prev as Reading), height_cm: data.height_cm, image_base64: data.image_base64 }))
        setHeightImg(data.image_base64 || "")
      } else {
        setHeightErr(data.error || "Height measurement failed")
      }
    } catch {
      setHeightErr("Failed to measure height")
    } finally {
      setHeightPhase("idle")
    }
  }

  const saveVitals = async () => {
    if (!reading || !patientId) return
    setSaving(true)
    try {
      const res = await fetch("/api/vitals/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          weight_kg: reading.weight_kg,
          height_cm: reading.height_cm,
          temperature_c: reading.temperature_c,
          oxygen_saturation: reading.oxygen_saturation,
          heart_rate: reading.heart_rate,
        }),
      })
      const data = await res.json()
      if (data.saved) {
        setSaved(true)
        setTimeout(() => router.push("/apps/patient"), 1500)
      }
    } catch {
      setError("Failed to save vitals")
    } finally {
      setSaving(false)
    }
  }

  const printCopy = async () => {
    if (!reading) return
    setPrinting(true)
    setPrintMsg("")
    try {
      const res = await fetch("/api/vitals/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight_kg: reading.weight_kg,
          height_cm: reading.height_cm,
          temperature_c: reading.temperature_c,
          oxygen_saturation: reading.oxygen_saturation,
          heart_rate: reading.heart_rate,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPrintMsg("Printed")
        setTimeout(() => setPrintMsg(""), 2500)
      } else {
        setPrintMsg("Print failed")
      }
    } catch {
      setPrintMsg("Print failed")
    } finally {
      setPrinting(false)
    }
  }

  useEffect(() => {
    const onMeasure = (e: Event) => {
      const detail = (e as CustomEvent).detail as { measurement: string }
      if (detail?.measurement) {
        setMeasuring((prev) => [...new Set([...prev, detail.measurement])])
      }
    }
    const onReading = (e: Event) => {
      const detail = (e as CustomEvent).detail as { reading: Reading }
      if (detail?.reading) {
        setHeightImg(detail.reading.image_base64 || "")
        reveal(detail.reading)
      }
    }
    window.addEventListener("measure-vital", onMeasure)
    window.addEventListener("vitals-reading", onReading)
    return () => {
      window.removeEventListener("measure-vital", onMeasure)
      window.removeEventListener("vitals-reading", onReading)
    }
  }, [reveal])

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 max-w-xl mx-auto w-full">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Vitals Check</h2>
        <p className="text-sm text-gray-500">
          Measure weight, height &amp; temperature
          {patientId && <span className="text-gray-400"> · Patient {patientId.slice(0, 8)}</span>}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {MEASUREMENTS.map((m) => {
          const isMeasuring = measuring.includes(m.key)
          const value = reading ? m.fmt(reading) : null
          return (
            <Card key={m.key} padding="md" className="flex flex-col items-center gap-1 text-center">
              <span className={`text-2xl ${isMeasuring ? "animate-pulse" : ""}`}>{m.icon}</span>
              <p className="text-xs text-gray-500">{m.label}</p>
              {isMeasuring ? (
                <span className="flex items-center gap-1.5 text-sm text-primary font-medium">
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  Measuring
                </span>
              ) : value ? (
                <span className="flex items-center gap-1.5">
                  <p className="text-lg font-bold text-foreground tabular-nums">
                    {value} <span className="text-xs font-medium text-gray-400">{m.unit}</span>
                  </p>
                  <span className="text-sm text-success">&#10003;</span>
                </span>
              ) : (
                <p className="text-sm text-gray-400">--</p>
              )}
            </Card>
          )
        })}
      </div>

      {heightPhase === "instruct" && (
        <div className="rounded-2xl bg-amber-50 border border-amber-300 p-5 text-center">
          <p className="text-xl font-bold text-amber-900">Please step back 3 steps from the camera</p>
          <p className="text-sm text-amber-700 mt-1">Stand straight, full body visible, feet on the ground...</p>
        </div>
      )}

      {heightImg && (
        <div className="flex items-center gap-3 rounded-2xl bg-gray-50 border border-gray-200 p-3">
          <img src={`data:image/jpeg;base64,${heightImg}`} alt="Height capture"
            className="w-24 h-24 object-cover rounded-lg border border-gray-300" />
          <div>
            <p className="text-lg font-bold text-foreground">
              Estimated height: {reading?.height_cm.toFixed(0)} cm
            </p>
            <span className="inline-block text-xs font-medium text-white bg-primary rounded-full px-2 py-0.5">AI estimate</span>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}

      {heightErr && <p className="text-xs text-red-500 text-center">{heightErr}</p>}

      {!reading && !saved && (
        <div className="flex flex-col gap-3">
          <button onClick={startMeasurement} disabled={measuring.length > 0 || heightPhase === "measuring"}
            className="w-full py-6 rounded-2xl bg-primary text-white text-xl font-bold hover:bg-primary-dark transition-colors disabled:bg-gray-300">
            {measuring.length > 0 ? "Measuring..." : "START MEASUREMENT"}
          </button>
          <button onClick={measureHeight} disabled={heightPhase === "instruct" || heightPhase === "measuring"}
            className="w-full py-4 rounded-2xl bg-gray-100 border border-gray-300 text-foreground text-lg font-bold hover:bg-gray-200 transition-colors disabled:bg-gray-100">
            {heightPhase === "instruct" ? "Step back 3 steps..." : heightPhase === "measuring" ? "Analyzing..." : "Measure Height (Camera)"}
          </button>
        </div>
      )}

      {reading && !saved && (
        <button onClick={measureHeight} disabled={heightPhase === "instruct" || heightPhase === "measuring"}
          className="w-full py-4 rounded-2xl bg-gray-100 border border-gray-300 text-foreground text-lg font-bold hover:bg-gray-200 transition-colors disabled:bg-gray-100">
          {heightPhase === "instruct" ? "Step back 3 steps..." : heightPhase === "measuring" ? "Analyzing..." : "Re-measure Height"}
        </button>
      )}

      {reading && !saved && patientId && (
        <div className="flex flex-col gap-3">
          <button onClick={saveVitals} disabled={saving}
            className="w-full py-4 rounded-2xl bg-teal text-white text-lg font-bold hover:bg-teal-dark transition-colors disabled:bg-gray-300">
            {saving ? "Saving..." : "Save to Record"}
          </button>
          <button onClick={printCopy} disabled={printing}
            className="w-full py-4 rounded-2xl bg-gray-100 border border-gray-300 text-foreground text-lg font-bold hover:bg-gray-200 transition-colors disabled:bg-gray-100">
            {printing ? "Printing..." : "Print Copy"}
          </button>
          {printMsg && <p className="text-xs text-center text-gray-500">{printMsg}</p>}
        </div>
      )}

      {reading && !saved && !patientId && (
        <p className="text-xs text-gray-400 text-center">
          Measurements complete. The AI assistant will save these to your patient record.
        </p>
      )}

      {saved && (
        <div className="text-center py-8">
          <p className="text-4xl text-success">&#10003;</p>
          <p className="text-lg font-semibold text-foreground mt-2">Vitals Saved!</p>
          <p className="text-sm text-gray-500">Returning to patient record...</p>
        </div>
      )}
    </div>
  )
}

export default function VitalsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <VitalsInner />
    </Suspense>
  )
}
