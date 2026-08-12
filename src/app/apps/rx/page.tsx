"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"

interface Medication {
  name: string
  dosage?: string
  frequency?: string
  duration?: string
  instructions?: string
}

interface Prescription {
  id: string
  formatted_number: string
  patient_name: string
  doctor_name?: string
  medications: Medication[]
  note?: string
  created_at: string
}

export default function RxPage() {
  const [number, setNumber] = useState("")
  const [name, setName] = useState("")
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [searched, setSearched] = useState(false)
  const [printing, setPrinting] = useState<string>("")

  const lookup = async () => {
    setError("")
    setPrescriptions([])
    setSearched(false)
    if (!number.trim() || !name.trim()) {
      setError("Please enter both your queue number and your name.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        `/api/rx/lookup?number=${encodeURIComponent(number)}&name=${encodeURIComponent(name)}`,
      )
      const data = await res.json()
      if (res.ok) {
        setPrescriptions(data.prescriptions || [])
        setSearched(true)
      } else {
        setError(data.error || "Lookup failed.")
        setSearched(true)
      }
    } catch {
      setError("Failed to look up your prescription.")
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  const printRx = async (rx: Prescription) => {
    setPrinting(rx.id)
    try {
      await fetch("/api/rx/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescription: rx }),
      })
    } catch {
      /* ignore */
    }
    setPrinting("")
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 max-w-xl mx-auto w-full">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">My Prescription</h2>
        <p className="text-sm text-gray-500">View your prescription after seeing the doctor</p>
      </div>

      <Card className="flex flex-col gap-3 px-4 py-4" padding="none">
        <div>
          <label htmlFor="rx-number" className="text-xs text-gray-500 uppercase tracking-wider font-medium">
            Queue Number
          </label>
          <input
            id="rx-number"
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="e.g. A-012 or 12"
            maxLength={20}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label htmlFor="rx-name" className="text-xs text-gray-500 uppercase tracking-wider font-medium">
            Your Full Name
          </label>
          <input
            id="rx-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter the name you registered with"
            maxLength={100}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button onClick={lookup} disabled={loading}
          className="w-full py-4 rounded-xl bg-primary text-white text-lg font-bold hover:bg-primary-dark transition-colors disabled:bg-gray-300">
          {loading ? "Looking up..." : "VIEW PRESCRIPTION"}
        </button>
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        {!error && searched && prescriptions.length === 0 && (
          <p className="text-xs text-gray-500 text-center">
            No prescription found for that number and name.
          </p>
        )}
      </Card>

      {prescriptions.length > 0 && (
        <div className="flex flex-col gap-4">
          {prescriptions.map((rx) => (
            <Card key={rx.id} padding="none" className="overflow-hidden">
              <div className="px-5 py-3 bg-teal/5 border-b border-teal/20 flex items-center justify-between">
                <div>
                  <p className="text-xs text-teal uppercase tracking-wider font-medium">Prescription</p>
                  <p className="text-lg font-bold text-foreground tabular-nums">{rx.formatted_number}</p>
                </div>
                <button onClick={() => printRx(rx)} disabled={printing === rx.id}
                  className="px-4 py-2 rounded-xl bg-teal text-white text-sm font-semibold hover:bg-teal-dark transition-colors disabled:bg-gray-300">
                  {printing === rx.id ? "Printing..." : "🖨 Print"}
                </button>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div className="text-sm">
                  <p className="text-gray-500">Patient: <span className="text-foreground font-medium">{rx.patient_name}</span></p>
                  {rx.doctor_name && (
                    <p className="text-gray-500">Doctor: <span className="text-foreground font-medium">{rx.doctor_name}</span></p>
                  )}
                  <p className="text-gray-400 text-xs mt-1">
                    {new Date(rx.created_at).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {(rx.medications || []).map((m, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5">
                      <p className="text-sm font-bold text-foreground">
                        {i + 1}. {m.name}
                      </p>
                      <div className="mt-1.5 grid grid-cols-1 gap-1 text-sm text-gray-600 dark:text-gray-300">
                        {m.dosage && <p>Dosage: <span className="text-foreground font-medium">{m.dosage}</span></p>}
                        {m.frequency && <p>Frequency: <span className="text-foreground font-medium">{m.frequency}</span></p>}
                        {m.duration && <p>Duration: <span className="text-foreground font-medium">{m.duration}</span></p>}
                        {m.instructions && <p>Instructions: <span className="text-foreground font-medium">{m.instructions}</span></p>}
                      </div>
                    </div>
                  ))}
                </div>

                {rx.note && (
                  <p className="text-xs text-gray-500 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">{rx.note}</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
