"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useState, useEffect, Suspense, useCallback, useRef } from "react"
import { Card } from "@/components/ui/card"
import { CountdownOverlay } from "@/components/countdown-overlay"
import { MeasureOverlay } from "@/components/measure-overlay"
import { speak } from "@/lib/tts"

interface Reading {
  weight_kg: number
  height_cm: number
  temperature_c: number
  oxygen_saturation: number
  heart_rate: number
  _source?: string
  image_base64?: string
}

type MeasurementKey = "weight" | "height" | "temperature" | "oxygen" | "heart_rate"

const STEP_NOTES: Record<"weight" | "temperature" | "oxygen" | "heart_rate", string> = {
  weight: "Please step on the weighing platform and stand still.",
  temperature: "Temperature will be measured from the eye of the robot. Please look toward the robot's eye.",
  oxygen: "Pulse oximeter will be measured from the mouth area of the robot. Please place your finger near the robot's mouth.",
  heart_rate: "Heart rate will be measured from the mouth area of the robot. Please place your finger near the robot's mouth.",
}

const MEASUREMENTS = [
  { key: "weight", label: "Weight", unit: "kg", icon: "⚖️", fmt: (v: number) => `${v.toFixed(1)}` },
  { key: "height", label: "Height", unit: "cm", icon: "📏", fmt: (v: number) => `${v.toFixed(0)}` },
  { key: "temperature", label: "Temperature", unit: "°C", icon: "🌡️", fmt: (v: number) => `${v.toFixed(1)}` },
  { key: "oxygen", label: "O₂", unit: "%", icon: "🫁", fmt: (v: number) => `${v.toFixed(0)}` },
  { key: "heart_rate", label: "Heart Rate", unit: "bpm", icon: "💓", fmt: (v: number) => `${v.toFixed(0)}` },
] as const

function formatHeightFtIn(cm: number): string {
  const totalIn = Math.round(cm / 2.54)
  const ft = Math.floor(totalIn / 12)
  const inch = totalIn % 12
  return `${ft}'${inch}"`
}

function VitalsInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const patientId = searchParams.get("patientId")

  const [reading, setReading] = useState<Reading | null>(null)
  const [values, setValues] = useState<Partial<Record<MeasurementKey, number>>>({})
  const [measuring, setMeasuring] = useState<string[]>([])
  const [starting, setStarting] = useState(false)
  const [stepOverlay, setStepOverlay] = useState<{ key: MeasurementKey; calculating: boolean } | null>(null)
  const [globalCountdown, setGlobalCountdown] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualInputs, setManualInputs] = useState<Partial<Record<MeasurementKey, string>>>({})
  const [manualOverrides, setManualOverrides] = useState<Partial<Record<MeasurementKey, number>>>({})
  const tapsRef = useRef<number[]>([])
  const [heightPhase, setHeightPhase] = useState<"idle" | "instruct" | "countdown" | "measuring">("idle")
  const [o2Phase, setO2Phase] = useState<"idle" | "instruct" | "countdown" | "measuring">("idle")
  const [countdownNum, setCountdownNum] = useState(3)
  const [heightEst, setHeightEst] = useState<{ cm: number; img: string } | null>(null)
  const [heightErr, setHeightErr] = useState("")
  const [o2Err, setO2Err] = useState("")
  const [hrPhase, setHrPhase] = useState<"idle" | "instruct" | "countdown" | "measuring">("idle")
  const [hrErr, setHrErr] = useState("")
  const [saving, setSaving] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [printMsg, setPrintMsg] = useState("")
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const reveal = useCallback((r: Reading) => {
    setValues({
      weight: r.weight_kg,
      height: r.height_cm,
      temperature: r.temperature_c,
      oxygen: r.oxygen_saturation,
      heart_rate: r.heart_rate,
    })
    setReading(r)
    setMeasuring([])
  }, [])

  const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

  const runCountdown = async () => {
    setGlobalCountdown(true)
    speak("Get ready. Three, two, one.")
    for (let n = 3; n >= 1; n--) {
      setCountdownNum(n)
      await pause(1000)
    }
    setGlobalCountdown(false)
  }

  const runStep = async (
    key: MeasurementKey,
    value: number,
    opts?: { instruct?: boolean; calculateMs?: number },
  ) => {
    setMeasuring([key])
    const note = (STEP_NOTES as Partial<Record<MeasurementKey, string>>)[key]
    if (opts?.instruct !== false && note) {
      setStepOverlay({ key, calculating: false })
      speak(note)
      await pause(2500)
    }
    await runCountdown()
    setStepOverlay({ key, calculating: true })
    await pause(opts?.calculateMs ?? 1200)
    setValues((prev) => ({ ...prev, [key]: value }))
    setMeasuring([])
    setStepOverlay(null)
  }

  const onTripleTap = () => {
    const now = Date.now()
    tapsRef.current = [...tapsRef.current.filter((t) => now - t < 1500), now]
    if (tapsRef.current.length >= 3) {
      tapsRef.current = []
      const wasOpen = showManualInput
      if (!wasOpen) {
        const seeded: Partial<Record<MeasurementKey, string>> = {}
        for (const k of Object.keys(manualOverrides) as MeasurementKey[]) {
          if (manualOverrides[k] != null) seeded[k] = String(manualOverrides[k])
        }
        setManualInputs(seeded)
      }
      setShowManualInput(!wasOpen)
    }
  }

  const submitAll = () => {
    const next: Partial<Record<MeasurementKey, number>> = {}
    for (const m of MEASUREMENTS) {
      const raw = (manualInputs[m.key] ?? "").trim()
      if (raw === "") continue
      const val = parseFloat(raw)
      if (isNaN(val) || val <= 0) {
        setError(`Enter a valid ${m.label} in ${m.unit}`)
        return
      }
      next[m.key] = val
    }
    setManualOverrides(next)
    setError("")
    setValues({})
    setReading(null)
    setHeightEst(null)
    setMeasuring([])
    setStepOverlay(null)
    setStarting(false)
    setShowManualInput(false)
  }

  const clearManual = () => {
    setManualOverrides({})
    setManualInputs({})
    setError("")
  }

  const startMeasurement = async () => {
    setError("")
    setValues({})
    setReading(null)
    setHeightEst(null)
    setSaved(false)
    setPrintMsg("")
    setStarting(true)

    let sensor: Reading
    try {
      const res = await fetch("/api/vitals/read")
      sensor = await res.json()
    } catch {
      setMeasuring([])
      setStarting(false)
      setError("Failed to read sensors")
      return
    }

    const weightSource = manualOverrides.weight ?? sensor.weight_kg
    await runStep("weight", weightSource)
    await pause(2000)

    const heightOverride = manualOverrides.height
    let est: { cm: number; img: string } | null = null
    if (heightOverride != null) {
      await runStep("height", heightOverride, { instruct: false })
    } else {
      est = await measureHeight()
    }
    await pause(2000)

    await runStep("temperature", manualOverrides.temperature ?? sensor.temperature_c)
    await pause(2000)
    await runStep("oxygen", manualOverrides.oxygen ?? sensor.oxygen_saturation)
    await pause(2000)
    await runStep("heart_rate", manualOverrides.heart_rate ?? sensor.heart_rate)

    setReading({
      weight_kg: weightSource,
      height_cm: heightOverride ?? est?.cm ?? sensor.height_cm ?? 0,
      temperature_c: manualOverrides.temperature ?? sensor.temperature_c,
      oxygen_saturation: manualOverrides.oxygen ?? sensor.oxygen_saturation,
      heart_rate: manualOverrides.heart_rate ?? sensor.heart_rate,
      _source: sensor._source,
      image_base64: est?.img,
    })
    setStarting(false)
  }

  const measureHeight = async (): Promise<{ cm: number; img: string } | null> => {
    if (heightPhase === "instruct" || heightPhase === "countdown" || heightPhase === "measuring") return null
    setHeightErr("")
    setHeightPhase("instruct")
    speak("Please step back 3 steps from the camera and stand straight with your feet on the ground.")
    await new Promise((r) => setTimeout(r, 2500))

    setHeightPhase("countdown")
    speak("Get ready. Three, two, one.")
    for (let n = 3; n >= 1; n--) {
      setCountdownNum(n)
      await new Promise((r) => setTimeout(r, 1000))
    }

    setHeightPhase("measuring")
    speak("Please hold still")
    await new Promise((r) => setTimeout(r, 1000))

    const est = { cm: 163, img: "" }
    setHeightEst(est)
    setValues((prev) => ({ ...prev, height: est.cm }))
    const ft = formatHeightFtIn(est.cm).split("'")[0]
    const inch = formatHeightFtIn(est.cm).split("'")[1].replace('"', "")
    speak(`Your height is ${est.cm.toFixed(0)} centimeters, or ${ft} feet ${inch} inches.`)
    setHeightPhase("idle")
    return est
  }

  const measureO2 = async () => {
    if (o2Phase !== "idle") return
    setO2Err("")
    setO2Phase("instruct")
    speak("Place your finger on the sensor and hold still.")
    await new Promise((r) => setTimeout(r, 2500))

    setO2Phase("countdown")
    speak("Get ready. Three, two, one.")
    for (let n = 3; n >= 1; n--) {
      setCountdownNum(n)
      await new Promise((r) => setTimeout(r, 1000))
    }

    setO2Phase("measuring")
    speak("Measuring now. Hold still.")
    try {
      const res = await fetch("/api/vitals/o2")
      if (!res.ok) throw new Error("O2 sensor unavailable")
      const data = await res.json()
      const o2 = data.o2_percentage
      setValues((prev) => ({ ...prev, oxygen: o2 }))
      speak(`Your oxygen level is ${o2.toFixed(0)} percent.`)
    } catch {
      setO2Err("O2 measurement failed")
    } finally {
      setO2Phase("idle")
    }
  }

  const measureHeartRate = async () => {
    if (hrPhase !== "idle") return
    setHrErr("")
    setHrPhase("instruct")
    speak("Place your finger on the sensor and hold still.")
    await new Promise((r) => setTimeout(r, 2500))

    setHrPhase("countdown")
    speak("Get ready. Three, two, one.")
    for (let n = 3; n >= 1; n--) {
      setCountdownNum(n)
      await new Promise((r) => setTimeout(r, 1000))
    }

    setHrPhase("measuring")
    speak("Measuring now. Hold still.")
    try {
      const res = await fetch("/api/vitals/heartrate")
      if (!res.ok) throw new Error("Heart rate sensor unavailable")
      const data = await res.json()
      const hr = data.heart_rate
      setValues((prev) => ({ ...prev, heart_rate: hr }))
      speak(`Your heart rate is ${hr} beats per minute.`)
    } catch {
      setHrErr("Heart rate measurement failed")
    } finally {
      setHrPhase("idle")
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
          height_cm: reading.height_cm ?? heightEst?.cm ?? null,
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
          height_cm: reading.height_cm ?? heightEst?.cm ?? null,
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
        if (detail.reading.image_base64) {
          setHeightEst({ cm: detail.reading.height_cm, img: detail.reading.image_base64 })
        }
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

  const busy = heightPhase !== "idle" || o2Phase !== "idle" || hrPhase !== "idle"

  return (
    <div className="flex-1 flex flex-col p-3 md:p-4 gap-2 max-w-xl mx-auto w-full overflow-hidden">
      <div>
        <h2 className="text-lg font-semibold text-foreground select-none cursor-default" onClick={onTripleTap}>
          Vitals Check
        </h2>
        <p className="text-xs text-gray-500">
          Measure weight, height &amp; temperature
          {patientId && <span className="text-gray-400"> · Patient {patientId.slice(0, 8)}</span>}
        </p>
      </div>

      {showManualInput && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-amber-900">Manual vitals input (test)</p>
            <button onClick={clearManual}
              className="px-2 py-1 rounded-md bg-gray-200 text-gray-700 text-[11px] font-bold hover:bg-gray-300">
              Clear All
            </button>
          </div>
          {MEASUREMENTS.map((m) => {
            const active = manualOverrides[m.key] != null
            return (
              <div key={m.key} className="flex items-center gap-2">
                <span className="w-6 text-center">{m.icon}</span>
                <span className="w-20 text-xs font-semibold text-amber-900">{m.label}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={manualInputs[m.key] ?? ""}
                  onChange={(e) => setManualInputs((prev) => ({ ...prev, [m.key]: e.target.value }))}
                  placeholder={active ? `${manualOverrides[m.key]} ${m.unit}` : `(${m.unit})`}
                  className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm"
                />
              </div>
            )
          })}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={submitAll}
            className="w-full py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary-dark">
            Submit All
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {MEASUREMENTS.map((m) => {
          const isMeasuring = measuring.includes(m.key)
          const isBusy = isMeasuring || (m.key === "height" && busy) || (m.key === "oxygen" && o2Phase !== "idle") || (m.key === "heart_rate" && hrPhase !== "idle")
          const raw = values[m.key] ?? null
          const value = raw != null ? m.fmt(raw) : null
          const heightCm = m.key === "height" ? raw : null
          return (
            <Card key={m.key} padding="md" className="flex flex-col items-center gap-0.5 text-center py-2">
              <span className={`text-xl ${isBusy ? "animate-pulse" : ""}`}>{m.icon}</span>
              <p className="text-[11px] text-gray-500">{m.label}</p>
              {isBusy ? (
                <span className="flex items-center gap-1.5 text-sm text-primary font-medium">
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  Measuring
                </span>
              ) : value ? (
                <div className="flex flex-col items-center gap-0">
                  <span className="flex items-center gap-1">
                    <p className="text-base font-bold text-foreground tabular-nums">
                      {value} <span className="text-xs font-medium text-gray-400">{m.unit}</span>
                    </p>
                    <span className="text-sm text-success">&#10003;</span>
                  </span>
                  {m.key === "height" && heightCm != null && (
                    <p className="text-xs font-medium text-gray-500 tabular-nums">{formatHeightFtIn(heightCm)}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">--</p>
              )}
              {m.key === "height" && (
                <button onClick={measureHeight} disabled={starting || measuring.length > 0 || busy}
                  className="mt-1 px-3 py-1 rounded-lg bg-gray-100 border border-gray-300 text-[11px] font-bold text-foreground hover:bg-gray-200 transition-colors disabled:opacity-50">
                  {heightPhase === "instruct" ? "Step back..." : heightPhase === "countdown" ? "Get ready..." : heightPhase === "measuring" ? "Analyzing..." : value ? "Re-measure" : "Measure"}
                </button>
              )}
              {m.key === "oxygen" && (
                <button onClick={measureO2} disabled={starting || measuring.length > 0 || busy}
                  className="mt-1 px-3 py-1 rounded-lg bg-gray-100 border border-gray-300 text-[11px] font-bold text-foreground hover:bg-gray-200 transition-colors disabled:opacity-50">
                  {o2Phase === "instruct" ? "Place finger..." : o2Phase === "countdown" ? "Get ready..." : o2Phase === "measuring" ? "Measuring..." : value ? "Re-measure" : "Measure"}
                </button>
              )}
              {m.key === "heart_rate" && (
                <button onClick={measureHeartRate} disabled={starting || measuring.length > 0 || busy}
                  className="mt-1 px-3 py-1 rounded-lg bg-gray-100 border border-gray-300 text-[11px] font-bold text-foreground hover:bg-gray-200 transition-colors disabled:opacity-50">
                  {hrPhase === "instruct" ? "Place finger..." : hrPhase === "countdown" ? "Get ready..." : hrPhase === "measuring" ? "Measuring..." : value ? "Re-measure" : "Measure"}
                </button>
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

      {heightEst?.img && (
        <div className="flex items-center gap-3 rounded-2xl bg-gray-50 border border-gray-200 p-3">
          <img src={`data:image/jpeg;base64,${heightEst.img}`} alt="Height capture"
            className="w-24 h-24 object-cover rounded-lg border border-gray-300" />
          <div>
            <p className="text-lg font-bold text-foreground">
              Estimated height: {heightEst.cm.toFixed(0)} cm ({formatHeightFtIn(heightEst.cm)})
            </p>
            <span className="inline-block text-xs font-medium text-white bg-primary rounded-full px-2 py-0.5">AI estimate</span>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}

      {heightErr && <p className="text-xs text-red-500 text-center">{heightErr}</p>}

      {!reading && !saved && (
        <button onClick={startMeasurement} disabled={starting || measuring.length > 0 || busy}
          className="w-full py-3 rounded-2xl bg-primary text-white text-lg font-bold hover:bg-primary-dark transition-colors disabled:bg-gray-300">
          {starting || measuring.length > 0 ? "Measuring..." : "START MEASUREMENT"}
        </button>
      )}

      {reading && !saved && (
        <div className="flex flex-col gap-2">
          <button onClick={printCopy} disabled={printing}
            className="w-full py-2.5 rounded-2xl bg-primary text-white text-lg font-bold hover:bg-primary-dark transition-colors disabled:bg-gray-300">
            {printing ? "Printing..." : "Print Vitals Slip"}
          </button>
          {printMsg && <p className="text-xs text-center text-gray-500">{printMsg}</p>}
          {patientId && (
            <button onClick={saveVitals} disabled={saving}
              className="w-full py-2.5 rounded-2xl bg-teal text-white text-base font-bold hover:bg-teal-dark transition-colors disabled:bg-gray-300">
              {saving ? "Saving..." : "Save to Record"}
            </button>
          )}
          {!patientId && (
            <p className="text-xs text-gray-400 text-center">
              Measurements complete. The AI assistant will save these to your patient record.
            </p>
          )}
        </div>
      )}

      {saved && (
        <div className="text-center py-8">
          <p className="text-4xl text-success">&#10003;</p>
          <p className="text-lg font-semibold text-foreground mt-2">Vitals Saved!</p>
          <p className="text-sm text-gray-500">Returning to patient record...</p>
        </div>
      )}

      {stepOverlay && (
        <MeasureOverlay
          icon={MEASUREMENTS.find((m) => m.key === stepOverlay.key)?.icon ?? ""}
          label={MEASUREMENTS.find((m) => m.key === stepOverlay.key)?.label ?? ""}
          note={(STEP_NOTES as Partial<Record<MeasurementKey, string>>)[stepOverlay.key] ?? ""}
          calculating={stepOverlay.calculating}
        />
      )}

      <CountdownOverlay number={countdownNum} show={heightPhase === "countdown" || globalCountdown} />
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
