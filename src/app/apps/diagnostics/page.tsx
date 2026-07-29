"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { Card } from "@/components/ui/card"
import { HeartDiagram } from "@/components/dashboard/heart-diagram"
import { StatTile } from "@/components/dashboard/stat-tile"
import { ScheduleList } from "@/components/dashboard/schedule-list"
import { OrganRow } from "@/components/dashboard/organ-row"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { heartHotspots, heartRateTrend, bodyConditions } from "@/lib/mock-patient"
import { nextCheckup, scheduleItems } from "@/lib/mock-schedule"

function DiagnosticsInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const patientId = searchParams.get("patientId")
  const search = searchParams.get("search")

  const [sensors, setSensors] = useState<{
    weight_kg: number
    temperature_c: number
    oxygen_saturation: number
    heart_rate: number
    _source: string
  } | null>(null)
  const [reading, setReading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [symptomLog, setSymptomLog] = useState<{
    symptoms: string
    response: string
    timestamp: number
  } | null>(null)

  useEffect(() => {
    if (search === "interactive") {
      try {
        const data = sessionStorage.getItem("lastSymptomCheck")
        if (data) setSymptomLog(JSON.parse(data))
      } catch {
        /* ignore */
      }
    }
  }, [search])

  const readSensors = async () => {
    setReading(true)
    setError("")
    try {
      const res = await fetch("/api/vitals/read")
      const data = await res.json()
      setSensors(data)
    } catch {
      setError("Failed to read sensors")
    } finally {
      setReading(false)
    }
  }

  const saveVitals = async () => {
    if (!sensors || !patientId) return
    setSaving(true)
    try {
      const res = await fetch("/api/vitals/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          weight_kg: sensors.weight_kg,
          temperature_c: sensors.temperature_c,
          oxygen_saturation: sensors.oxygen_saturation,
          heart_rate: sensors.heart_rate,
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

  if (patientId && search === "basic") {
    return (
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 max-w-xl mx-auto w-full">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Basic Diagnostic</h2>
          <p className="text-sm text-gray-500">Measurements complete</p>
        </div>

        {!sensors && !saved && (
          <Card padding="md" className="flex flex-col gap-4 items-center text-center">
            <p className="text-sm text-gray-500">Reading vitals from sensors...</p>
            <button onClick={readSensors} disabled={reading}
              className="w-full py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors disabled:bg-gray-300">
              {reading ? "Measuring..." : "Read Measurements"}
            </button>
          </Card>
        )}

        {sensors && !saved && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Weight", value: `${sensors.weight_kg} kg`, icon: "⚖️" },
                { label: "Temperature", value: `${sensors.temperature_c} °C`, icon: "🌡️" },
                { label: "Heart Rate", value: `${sensors.heart_rate} bpm`, icon: "💓" },
                { label: "Oximeter", value: "Not available", icon: "⛔" },
              ].map((v) => (
                <Card key={v.label} padding="md" className="flex flex-col items-center gap-1 text-center">
                  <span className="text-2xl">{v.icon}</span>
                  <p className="text-xs text-gray-500">{v.label}</p>
                  <p className={`text-lg font-bold ${v.value === "Not available" ? "text-gray-400" : "text-foreground"}`}>
                    {v.value}
                  </p>
                </Card>
              ))}
            </div>

            <button onClick={saveVitals} disabled={saving}
              className="w-full py-3 rounded-xl bg-teal text-white font-semibold hover:bg-teal-dark transition-colors disabled:bg-gray-300">
              {saving ? "Saving..." : "Save to Record"}
            </button>
          </>
        )}

        {saved && (
          <div className="text-center py-8">
            <p className="text-4xl text-success">&#10003;</p>
            <p className="text-lg font-semibold text-foreground mt-2">Saved!</p>
            <p className="text-sm text-gray-500">Returning to patient record...</p>
          </div>
        )}

        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      </div>
    )
  }

  if (patientId && search === "interactive") {
    return (
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 max-w-xl mx-auto w-full">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Symptom Checker</h2>
          <p className="text-sm text-gray-500">Interactive diagnostic conversation</p>
        </div>

        <Card padding="md" className="flex flex-col gap-4">
          {symptomLog ? (
            <>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Symptoms described</p>
                <p className="text-sm text-foreground bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  {symptomLog.symptoms}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">AI Response</p>
                <p className="text-sm text-foreground bg-primary/5 rounded-xl p-3">
                  {symptomLog.response}
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <span>⚕️</span>
                <p>
                  I&apos;m an AI assistant, not a doctor. This information is for reference only.
                  Please consult a qualified healthcare professional for proper diagnosis and treatment.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">No symptom conversation found.</p>
              <p className="text-xs text-gray-400 mt-2">Tap the AI Companion button to discuss your symptoms.</p>
            </div>
          )}
        </Card>

        <button onClick={() => router.push("/apps/patient")}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors">
          Back to Patient Records
        </button>
      </div>
    )
  }

  if (patientId) {
    return (
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 max-w-xl mx-auto w-full">
        <button onClick={() => router.push("/apps/patient")}
          className="text-xs text-gray-500 hover:text-foreground transition-colors self-start">
          &larr; Back to Patient Records
        </button>

        <div>
          <h2 className="text-2xl font-semibold text-foreground">Record Vitals</h2>
          <p className="text-sm text-gray-500">Patient ID: {patientId.slice(0, 8)}</p>
        </div>

        <Card padding="md" className="flex flex-col gap-4">
          <p className="text-sm text-gray-500 text-center">
            {sensors
              ? "Sensor readings complete. Review and save."
              : "Tap the button below to read vitals from connected sensors."}
          </p>

          {sensors && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Weight", value: `${sensors.weight_kg} kg` },
                { label: "Temperature", value: `${sensors.temperature_c} °C` },
                { label: "Oxygen Saturation", value: `${sensors.oxygen_saturation}%` },
                { label: "Heart Rate", value: `${sensors.heart_rate} bpm` },
              ].map((v) => (
                <div key={v.label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">{v.label}</p>
                  <p className="text-lg font-semibold text-foreground">{v.value}</p>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          {!sensors && !saved && (
            <button onClick={readSensors} disabled={reading}
              className="w-full py-4 rounded-xl bg-primary text-white font-bold text-lg hover:bg-primary-dark transition-colors disabled:bg-gray-300">
              {reading ? "Reading..." : "Read Sensors"}
            </button>
          )}

          {sensors && !saved && (
            <button onClick={saveVitals} disabled={saving}
              className="w-full py-3 rounded-xl bg-teal text-white font-semibold hover:bg-teal-dark transition-colors disabled:bg-gray-300">
              {saving ? "Saving..." : "Save to Record"}
            </button>
          )}

          {saved && (
            <div className="text-center py-4">
              <p className="text-success font-semibold">&#10003; Vitals saved!</p>
              <p className="text-xs text-gray-400 mt-1">Returning to patient record...</p>
            </div>
          )}
        </Card>
      </div>
    )
  }

  return (
    <DashboardShell>
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Overview Conditions</h2>
        <p className="text-sm text-gray-500">Simple patient diagnostic assistant</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="flex flex-col gap-4">
          <HeartDiagram hotspots={heartHotspots} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile label="Blood Status" value="116/70" accent="primary" trend={[70, 72, 68, 74, 71, 70]} />
            <StatTile label="Heart Rate" value={120} unit="bpm" accent="danger" trend={heartRateTrend} />
            <StatTile label="Blood Count" value="80/90" accent="teal" trend={[82, 85, 80, 88, 84, 90]} />
            <StatTile label="Glucose Level" value={93} unit="mg/dL" accent="warning" trend={[88, 90, 93, 91, 95, 93]} />
          </div>
        </div>

        <ScheduleList nextCheckup={nextCheckup} items={scheduleItems} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">My Body Condition</h3>
        <OrganRow conditions={bodyConditions} />
      </div>
    </DashboardShell>
  )
}

export default function DiagnosticsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <DiagnosticsInner />
    </Suspense>
  )
}
