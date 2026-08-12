"use client"

import { useState, useEffect, useCallback } from "react"

interface ServingData {
  formatted: string
  patientName: string
  doctorName: string
}

export function NowServingWidget() {
  const [serving, setServing] = useState<ServingData>({ formatted: "A-000", patientName: "", doctorName: "" })

  const fetchServing = useCallback(async () => {
    try {
      const res = await fetch("/api/queue/serving")
      if (res.ok) {
        const data = await res.json()
        setServing({
          formatted: data.formatted || "A-000",
          patientName: data.patientName || "",
          doctorName: data.doctorName || "",
        })
      }
    } catch {
      /* ignore polling errors */
    }
  }, [])

  useEffect(() => {
    fetchServing()
    const interval = setInterval(fetchServing, 5000)
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail as { formatted: string; patientName: string; doctorName: string }
      if (detail) {
        setServing({
          formatted: detail.formatted || "A-000",
          patientName: detail.patientName || "",
          doctorName: detail.doctorName || "",
        })
      }
    }
    window.addEventListener("queue-update", onUpdate)
    return () => {
      clearInterval(interval)
      window.removeEventListener("queue-update", onUpdate)
    }
  }, [fetchServing])

  const hasServing = serving.formatted !== "A-000"

  return (
    <div className="fixed bottom-6 left-6 z-40 pointer-events-none select-none">
      <div className="flex items-center gap-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4 shadow-lg">
        <span className={`w-3.5 h-3.5 rounded-full ${hasServing ? "bg-success animate-pulse" : "bg-gray-300"}`} />
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Now Serving</p>
          <p className={`text-4xl font-bold tabular-nums leading-tight ${hasServing ? "text-teal" : "text-gray-400"}`}>
            {serving.formatted}
          </p>
        </div>
        {hasServing && (serving.patientName || serving.doctorName) && (
          <div className="border-l border-gray-200 dark:border-gray-700 pl-4 ml-1 max-w-[220px]">
            {serving.patientName && serving.patientName !== "Unknown" && (
              <p className="text-xl font-semibold text-foreground truncate">{serving.patientName}</p>
            )}
            {serving.doctorName && (
              <p className="text-sm text-gray-500 truncate">{serving.doctorName}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
