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
  const search = searchParams.get("search")

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

  if (search === "interactive") {
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

        <button onClick={() => router.push("/apps/vitals")}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors">
          Measure Vitals
        </button>
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
