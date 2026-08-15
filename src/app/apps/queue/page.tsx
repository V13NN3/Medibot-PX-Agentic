"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"

interface QueueData {
  number: number
  formatted: string
  nowServing: number
  date: string
}

interface ServingData {
  formatted: string
  nowServing: number
  currentNumber: number
}

interface Doctor {
  id: string
  name: string
  specialty: string
  available: boolean
}

const defaultQueue: QueueData = { number: 0, formatted: "—", nowServing: 0, date: "" }
const defaultServing: ServingData = { formatted: "A-000", nowServing: 0, currentNumber: 0 }

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueData>(defaultQueue)
  const [serving, setServing] = useState<ServingData>(defaultServing)
  const [loading, setLoading] = useState(false)
  const [gettingQueue, setGettingQueue] = useState(false)
  const [hasTicket, setHasTicket] = useState(false)
  const [patientName, setPatientName] = useState("")
  const [doctorId, setDoctorId] = useState("")
  const [doctors, setDoctors] = useState<Doctor[]>([])

  const fetchServing = useCallback(async () => {
    try {
      const res = await fetch("/api/queue/serving")
      if (res.ok) {
        const data = await res.json()
        setServing(data)
      }
    } catch {
      /* ignore polling errors */
    }
  }, [])

  useEffect(() => {
    fetchServing()
    const interval = setInterval(fetchServing, 5000)
    return () => clearInterval(interval)
  }, [fetchServing])

  useEffect(() => {
    fetch("/api/doctors/search?q=")
      .then((r) => r.json())
      .then((data) => setDoctors((data.doctors || []).filter((d: Doctor) => d.available)))
      .catch(() => {})
  }, [])

  const getQueue = async () => {
    setGettingQueue(true)
    try {
      const res = await fetch("/api/queue/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_name: patientName, doctor_id: doctorId }),
      })
      if (!res.ok) return

      const data: QueueData = await res.json()
      setQueue(data)
      setHasTicket(true)

      const now = new Date()
      const phTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
      const time = phTime.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })

      await fetch("/api/queue/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: data.formatted, date: data.date, time }),
      })
    } catch (err) {
      console.error("[queue] getQueue error:", err)
    } finally {
      setGettingQueue(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col p-3 md:p-4 gap-2 max-w-xl mx-auto w-full overflow-y-auto overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Queue</h2>
        <p className="text-xs text-gray-500">Get a queue number &amp; print ticket</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="flex flex-col items-center gap-0.5 py-2" padding="none">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">
            Your Number
          </p>
          <p className="text-3xl md:text-4xl font-bold text-primary tabular-nums">
            {queue.formatted}
          </p>
        </Card>

        <Card className="flex flex-col items-center gap-0.5 py-2" padding="none">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">
            Now Serving
          </p>
          <p className={`text-3xl md:text-4xl font-bold tabular-nums ${
            serving.nowServing > 0 ? "text-teal" : "text-gray-400"
          }`}>
            {serving.formatted}
          </p>
        </Card>
      </div>

      <Card className="flex flex-col gap-2 px-3 py-2.5" padding="none">
        <div>
          <label htmlFor="queue-name" className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">
            Your Name <span className="normal-case font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="queue-name"
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Enter your name"
            maxLength={100}
            className="mt-1 w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label htmlFor="queue-doctor" className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">
            Your Doctor <span className="normal-case font-normal text-gray-400">(optional)</span>
          </label>
          <select
            id="queue-doctor"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="mt-1 w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">No preference / walk-in</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}{d.specialty ? ` — ${d.specialty}` : ""}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <button
        type="button"
        onClick={getQueue}
        disabled={gettingQueue}
        className={`w-full py-3 rounded-2xl text-white text-lg font-bold
                    transition-all duration-200 active:scale-[0.98]
                    ${gettingQueue
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-primary hover:bg-primary-dark shadow-lg shadow-primary/30"
                    }`}
      >
        {gettingQueue ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin text-lg">&#9696;</span>
            Printing...
          </span>
        ) : (
          <span className="tracking-wide">GET QUEUE NUMBER</span>
        )}
      </button>

      <Card className="flex items-center gap-3 px-4 py-2.5" padding="none">
        <span className="text-xl">&#9201;</span>
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">
            Now Serving
          </p>
          <p className="text-lg font-bold text-foreground tabular-nums">
            {serving.formatted}
          </p>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Recent Calls
          </p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {hasTicket ? (
            <div className="px-4 py-2 flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                Q
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-300 flex-1">
                Ticket <span className="font-semibold text-foreground">{queue.formatted}</span> issued
              </p>
              <span className="text-xs text-gray-400 shrink-0">now</span>
            </div>
          ) : (
            <div className="px-4 py-3 text-center text-sm text-gray-400">
              No calls yet. Tap &quot;Get Queue Number&quot; to start.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
