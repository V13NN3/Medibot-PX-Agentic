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

  const [patientName, setPatientName] = useState("")
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

  useEffect(() => {
    if (patientId) {
      fetch("/api/patient/search?q=")
        .then((r) => r.json())
        .catch(() => {})
    }
  }, [patientId])

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
        setTimeout(() => {
          router.push(`/apps/patient`)
        }, 1500)
      }
    } catch {
      setError("Failed to save vitals")
    } finally {
      setSaving(false)
    }
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
