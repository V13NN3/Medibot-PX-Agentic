"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"

const TIME_SLOTS = [
  "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
]

interface Doctor {
  id: string
  name: string
  specialty: string
}

function AppointmentInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const doctorId = searchParams.get("doctorId")

  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([])
  const [patientName, setPatientName] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [showBooking, setShowBooking] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [appointments, setAppointments] = useState<{
    id: string
    patient_name: string
    doctor_name: string
    appointment_date: string
    appointment_time: string
    status: string
  }[]>([])

  useEffect(() => {
    if (doctorId) {
      fetch(`/api/doctors/search?q=`)
        .then((r) => r.json())
        .then((data) => {
          const doc = (data.doctors || []).find((d: Doctor) => d.id === doctorId)
          if (doc) setDoctor(doc)
        })
        .catch(() => {})
    } else {
      fetch(`/api/doctors/search?q=`)
        .then((r) => r.json())
        .then((data) => setDoctorsList(data.doctors || []))
        .catch(() => {})
      fetch(`/api/appointments/list`)
        .then((r) => r.json())
        .then((data) => setAppointments(data.appointments || []))
        .catch(() => {})
    }
  }, [doctorId])

  const book = async () => {
    if (!patientName || !date || !time) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/appointments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: patientName,
          doctor_id: doctor?.id || "",
          appointment_date: date,
          appointment_time: time,
          reason,
        }),
      })
      const data = await res.json()
      if (data.appointment) {
        setSaved(true)
        setTimeout(() => router.push("/apps/find-doctor"), 2000)
      } else {
        setError(data.error || "Booking failed")
      }
    } catch {
      setError("Booking failed")
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  if (saved) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 text-center">
        <p className="text-4xl text-success">&#10003;</p>
        <h2 className="text-xl font-semibold text-foreground">Appointment Booked!</h2>
        <p className="text-sm text-gray-500">
          {doctor?.name || "Doctor"} on {date} at {time}
        </p>
        <p className="text-xs text-gray-400">Returning to Find My Doctor...</p>
      </div>
    )
  }

  if (doctorId && !doctor) {
    return (
      <div className="flex-1 flex flex-col p-3 md:p-4 gap-2 max-w-xl mx-auto w-full overflow-y-auto overflow-x-hidden">
        <p className="text-sm text-gray-400 text-center py-4">Loading doctor info...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-3 md:p-4 gap-2 max-w-xl mx-auto w-full overflow-y-auto overflow-x-hidden">
      {!doctorId && (
        <button onClick={() => router.push("/apps/find-doctor")}
          className="text-xs text-gray-500 hover:text-foreground transition-colors self-start">
          &larr; Back to Find My Doctor
        </button>
      )}

      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {doctorId ? "Book Appointment" : "Appointments"}
        </h2>
        <p className="text-xs text-gray-500">
          {doctorId ? `Schedule with ${doctor?.name || "doctor"}` : "Manage your appointments"}
        </p>
      </div>

      {!doctorId && !showBooking && (
        <>
          <p className="text-sm font-medium text-foreground">Would you like a diagnostic first?</p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => router.push("/apps/vitals")}
              className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 dark:bg-gray-800 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <span className="text-2xl">⚖️</span>
              <span className="text-xs font-semibold text-foreground">Vitals</span>
              <span className="text-[10px] text-gray-500 text-center">Weight, height, temperature</span>
            </button>
            <button onClick={() => router.push("/apps/diagnostics?search=interactive")}
              className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 dark:bg-gray-800 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <span className="text-2xl">💬</span>
              <span className="text-xs font-semibold text-foreground">Interactive</span>
              <span className="text-[10px] text-gray-500 text-center">Discuss your symptoms</span>
            </button>
            <button onClick={() => setShowBooking(true)}
              className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 dark:bg-gray-800 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <span className="text-2xl">📅</span>
              <span className="text-xs font-semibold text-foreground">Skip</span>
              <span className="text-[10px] text-gray-500 text-center">Go to booking</span>
            </button>
          </div>
        </>
      )}

      {doctorId || showBooking ? (
        <Card padding="md" className="flex flex-col gap-2.5">
          {doctor && (
            <div className="flex items-center gap-3 pb-2 border-b border-gray-100 dark:border-gray-800">
              <span className="w-9 h-9 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center">
                {doctor.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{doctor.name}</p>
                <p className="text-xs text-gray-500">{doctor.specialty}</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Patient Name</label>
            <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={today}
                className="w-full mt-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Time</label>
              <select value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
                <option value="">Select time</option>
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Reason (optional)</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., check-up, follow-up"
              className="w-full mt-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button onClick={book} disabled={saving || !patientName || !date || !time}
            className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:bg-gray-300">
            {saving ? "Booking..." : "Book Appointment"}
          </button>
        </Card>
      ) : (
        <>
          {appointments.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Upcoming</p>
              {appointments.map((a) => (
                <Card key={a.id} padding="sm" className="flex items-center gap-3 py-2">
                  <span className="text-lg">&#128197;</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{a.doctor_name || "Doctor"}</p>
                    <p className="text-xs text-gray-500">{a.patient_name} &middot; {a.appointment_date} at {a.appointment_time}</p>
                  </div>
                  <span className="text-[11px] text-gray-400 capitalize">{a.status}</span>
                </Card>
              ))}
            </div>
          )}

          <Card padding="md">
            <p className="text-sm text-gray-500 text-center mb-3">
              Book a new appointment with any doctor.
            </p>
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Select Doctor</label>
              <select value={doctor?.id || ""} onChange={(e) => {
                const doc = doctorsList.find((d) => d.id === e.target.value)
                if (doc) setDoctor(doc)
              }}
                className="w-full mt-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
                <option value="">Choose a doctor...</option>
                {doctorsList.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
                ))}
              </select>
            </div>
            <div className="mt-2">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Patient Name</label>
              <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={today}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Time</label>
                <select value={time} onChange={(e) => setTime(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
                  <option value="">Select time</option>
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={book} disabled={saving || !doctor || !patientName || !date || !time}
              className="w-full mt-3 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:bg-gray-300">
              {saving ? "Booking..." : "Book Appointment"}
            </button>
          </Card>
        </>
      )}
    </div>
  )
}

export default function AppointmentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <AppointmentInner />
    </Suspense>
  )
}
