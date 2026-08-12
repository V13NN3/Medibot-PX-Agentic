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
  const patient = serving.patientName && serving.patientName !== "Unknown" ? serving.patientName : ""

  return (
    <div className="fixed bottom-6 left-6 z-40 pointer-events-none select-none">
      <div
        className={`relative flex items-center gap-5 overflow-hidden rounded-3xl shadow-2xl
                    bg-gradient-to-br from-teal-500 to-teal-700 text-white px-7 py-5
                    ${hasServing ? "shadow-teal-500/40" : "opacity-80"}`}
      >
        <span
          aria-hidden
          className={`absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
                      ${hasServing ? "bg-white" : "bg-white/40"}`}
        />
        <span
          aria-hidden
          className={`absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
                      ${hasServing ? "bg-white" : "bg-white/40"}`}
        />

        <span
          aria-hidden
          className={`absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/10 rounded-3xl`}
        />

        <div className="flex flex-col items-center gap-1">
          <span className={`text-3xl ${hasServing ? "animate-bounce" : ""}`}>&#128276;</span>
          <span
            className={`w-3 h-3 rounded-full ${hasServing ? "bg-yellow-300 animate-pulse" : "bg-white/50"}`}
          />
        </div>

        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-100">
            Now Serving
          </p>
          <p className="text-6xl font-black tabular-nums leading-none drop-shadow-md">
            {serving.formatted}
          </p>
        </div>

        {(patient || serving.doctorName) && (
          <div className="relative border-l-2 border-white/25 pl-5 max-w-[240px]">
            {patient && (
              <p className="text-2xl font-bold truncate">{patient}</p>
            )}
            {serving.doctorName && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-teal-100 truncate">
                <span>&#128137;</span>
                {serving.doctorName}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
