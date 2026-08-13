"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"

interface Doctor {
  id: string
  name: string
  specialty: string
  avatar_initials: string
  available: boolean
}

function FindDoctorInner() {
  const searchParams = useSearchParams()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchDoctors = async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/doctors/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setDoctors(data.doctors || [])
    } catch {
      setDoctors([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const searchQ = searchParams.get("search")
    if (searchQ) {
      setQuery(searchQ)
      fetchDoctors(searchQ)
    } else {
      fetchDoctors("")
    }
  }, [searchParams])

  const available = doctors.filter((d) => d.available)
  const unavailable = doctors.filter((d) => !d.available)

  const handleSelect = (doctor: Doctor) => {
    window.location.href = `/apps/appointment?doctorId=${doctor.id}`
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 max-w-xl mx-auto w-full overflow-y-auto overflow-x-hidden">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Find My Doctor</h2>
        <p className="text-sm text-gray-500">Find your doctor or get assigned an available one</p>
      </div>

      <input type="search" value={query} placeholder="Search by name or specialty..."
        onChange={(e) => { setQuery(e.target.value); fetchDoctors(e.target.value) }}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm shadow-sm" />

      {loading && <p className="text-sm text-gray-400 text-center py-4">Loading...</p>}

      {!loading && available.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-success uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success" />
            Available
          </p>
          <div className="flex flex-col gap-2">
            {available.map((doc) => (
              <Card key={doc.id} padding="none" className="flex items-center gap-3 px-4 py-3">
                <span className="w-10 h-10 rounded-full bg-teal/10 text-teal text-sm font-semibold flex items-center justify-center shrink-0">
                  {doc.avatar_initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{doc.name}</p>
                  <p className="text-xs text-gray-500">{doc.specialty}</p>
                </div>
                <span className="text-xs text-success flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  Available
                </span>
                <button onClick={() => handleSelect(doc)}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors">
                  Select
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && unavailable.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-300" />
            Not Available
          </p>
          <div className="flex flex-col gap-2">
            {unavailable.map((doc) => (
              <Card key={doc.id} padding="none" className="flex items-center gap-3 px-4 py-3 opacity-70">
                <span className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 text-sm font-semibold flex items-center justify-center shrink-0">
                  {doc.avatar_initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{doc.name}</p>
                  <p className="text-xs text-gray-500">{doc.specialty}</p>
                </div>
                <span className="text-xs text-gray-400">Out of clinic</span>
                <button onClick={() => handleSelect(doc)}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors">
                  Schedule
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && doctors.length === 0 && query && (
        <p className="text-sm text-gray-400 text-center py-4">No doctors found matching &quot;{query}&quot;</p>
      )}
    </div>
  )
}

export default function FindDoctorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <FindDoctorInner />
    </Suspense>
  )
}
