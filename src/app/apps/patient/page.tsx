"use client"

import { useState, useCallback, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { CountdownOverlay } from "@/components/countdown-overlay"
import { speak } from "@/lib/tts"

type PageState = "search" | "results" | "verify" | "detail" | "new-patient"

interface PatientSummary {
  id: string
  name: string
  dob: string
  sex: string
  photo?: string
}

interface PatientDetail extends PatientSummary {
  address?: string
  contact_number?: string
  created_at: string
  photo?: string
}

interface VitalsRecord {
  id: number
  weight_kg: number
  temperature_c: number
  oxygen_saturation: number
  heart_rate: number
  recorded_at: string
}

function PatientInner() {
  const searchParams = useSearchParams()
  const [pageState, setPageState] = useState<PageState>("search")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PatientSummary[]>([])
  const [records, setRecords] = useState<PatientSummary[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [verifyDob, setVerifyDob] = useState("")
  const [verifyError, setVerifyError] = useState("")
  const [patient, setPatient] = useState<PatientDetail | null>(null)
  const [vitalsHistory, setVitalsHistory] = useState<VitalsRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [newForm, setNewForm] = useState({ name: "", dob: "", sex: "Male", address: "", contact_number: "", photo: "" })
  const [facePhase, setFacePhase] = useState<"idle" | "instruct" | "countdown" | "capturing">("idle")
  const [faceCount, setFaceCount] = useState(3)
  const [faceErr, setFaceErr] = useState("")
  const [initialized, setInitialized] = useState(false)

  const captureFace = async () => {
    if (facePhase !== "idle") return
    setFaceErr("")
    setFacePhase("instruct")
    speak("Please look at the camera and smile.")
    await new Promise((r) => setTimeout(r, 2500))
    setFacePhase("countdown")
    speak("Get ready. Three, two, one.")
    for (let n = 3; n >= 1; n--) {
      setFaceCount(n)
      await new Promise((r) => setTimeout(r, 1000))
    }
    setFacePhase("capturing")
    speak("Please hold still")
    try {
      const res = await fetch("/api/camera/face", { method: "POST" })
      const data = await res.json()
      if (data.image_base64) {
        setNewForm((prev) => ({ ...prev, photo: data.image_base64 }))
      } else {
        setFaceErr(data.error || "Capture failed")
      }
    } catch {
      setFaceErr("Capture failed")
    } finally {
      setFacePhase("idle")
    }
  }

  const loadRecords = useCallback(async () => {
    try {
      const res = await fetch("/api/patient/list")
      const data = await res.json()
      setRecords(data.patients || [])
    } catch {
      setRecords([])
    }
  }, [])

  const doSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (q.length < 2) {
      setResults([])
      setPageState("search")
      loadRecords()
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/patient/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.patients || [])
      setPageState(data.patients?.length ? "results" : "search")
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [loadRecords])

  useEffect(() => {
    if (initialized) return
    const searchQ = searchParams.get("search")
    if (searchQ) {
      setInitialized(true)
      setQuery(searchQ)
      doSearch(searchQ)
    } else {
      setInitialized(true)
      loadRecords()
    }
  }, [searchParams, doSearch, initialized, loadRecords])

  const selectPatient = (id: string) => {
    setSelectedId(id)
    setVerifyDob("")
    setVerifyError("")
    setPageState("verify")
  }

  const verifyPatient = async () => {
    if (!verifyDob) return
    setLoading(true)
    setVerifyError("")
    try {
      const res = await fetch("/api/patient/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId, dob: verifyDob }),
      })
      const data = await res.json()
      if (data.verified) {
        setPatient(data.patient)
        fetchVitals(selectedId)
        setPageState("detail")
      } else {
        setVerifyError("Incorrect date of birth")
      }
    } catch {
      setVerifyError("Verification failed")
    } finally {
      setLoading(false)
    }
  }

  const fetchVitals = async (patientId: string) => {
    try {
      const res = await fetch(`/api/vitals/read?patient_id=${patientId}`)
      if (res.ok) {
        const data = await res.json()
        setVitalsHistory(data.records || [])
      }
    } catch {
      /* ignore */
    }
  }

  const createPatient = async () => {
    if (!newForm.name || !newForm.dob || !newForm.sex) return
    setLoading(true)
    try {
      const res = await fetch("/api/patient/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      })
      const data = await res.json()
      if (data.patient) {
        setPatient(data.patient)
        setVitalsHistory([])
        setPageState("detail")
        setNewForm({ name: "", dob: "", sex: "Male", address: "", contact_number: "", photo: "" })
        loadRecords()
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  const goToVitals = () => {
    if (patient) {
      window.location.href = `/apps/vitals?patientId=${patient.id}`
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    return dateStr.slice(0, 10)
  }

  const calcAge = (dobStr: string) => {
    if (!dobStr) return 0
    const dob = new Date(dobStr)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
    return age
  }

  if (pageState === "detail" && patient) {
    return (
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 max-w-xl mx-auto w-full overflow-y-auto overflow-x-hidden">
        <button onClick={() => { setPageState("search"); setPatient(null); setResults([]); setQuery("") }}
          className="text-xs text-gray-500 hover:text-foreground transition-colors self-start">
          &larr; Back to search
        </button>

        <Card className="flex items-center gap-4" padding="md">
          {patient.photo ? (
            <img src={`data:image/jpeg;base64,${patient.photo}`} alt={patient.name}
              className="w-14 h-14 shrink-0 rounded-full object-cover border border-gray-200" />
          ) : (
            <div className="w-14 h-14 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold">
              {patient.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              ID {patient.id.slice(0, 8)} &middot; Age {calcAge(patient.dob)} &middot; {patient.sex}
            </p>
            <h2 className="text-xl font-semibold text-foreground truncate">{patient.name}</h2>
            <p className="text-xs text-gray-500">DOB: {formatDate(patient.dob)}</p>
          </div>
        </Card>

        {patient.address || patient.contact_number ? (
          <Card padding="md">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {patient.address && (
                <>
                  <span className="text-gray-500">Address</span>
                  <span className="text-foreground">{patient.address}</span>
                </>
              )}
              {patient.contact_number && (
                <>
                  <span className="text-gray-500">Contact</span>
                  <span className="text-foreground">{patient.contact_number}</span>
                </>
              )}
            </div>
          </Card>
        ) : null}

        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Vitals History</h3>
            <button onClick={goToVitals}
              className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors">
              Record Vitals &rarr;
            </button>
          </div>
          {vitalsHistory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No vitals recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {vitalsHistory.map((v) => (
                <div key={v.id} className="py-2 flex items-center justify-between text-sm">
                  <span className="text-xs text-gray-400 font-mono">
                    {new Date(v.recorded_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-foreground">
                    {v.weight_kg && `${v.weight_kg} kg`}{v.temperature_c && ` · ${v.temperature_c}°C`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    )
  }

  if (pageState === "new-patient") {
    return (
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 max-w-xl mx-auto w-full overflow-y-auto overflow-x-hidden">
        <button onClick={() => setPageState("search")}
          className="text-xs text-gray-500 hover:text-foreground transition-colors self-start">
          &larr; Back
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-foreground">New Patient</h2>
          <p className="text-sm text-gray-500">Register a new patient</p>
        </div>
        <Card padding="md" className="flex flex-col gap-4">
          {newForm.photo ? (
            <div className="flex flex-col items-center gap-2">
              <img src={`data:image/jpeg;base64,${newForm.photo}`} alt="Patient face"
                className="w-28 h-28 rounded-full object-cover border-2 border-primary" />
              <button onClick={captureFace} disabled={facePhase !== "idle"}
                className="px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-xs font-bold text-foreground hover:bg-gray-200 transition-colors disabled:opacity-50">
                {facePhase === "instruct" ? "Step back..." : facePhase === "countdown" ? "Get ready..." : facePhase === "capturing" ? "Capturing..." : "Re-capture Photo"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button onClick={captureFace} disabled={facePhase !== "idle"}
                className="px-5 py-3 rounded-xl bg-gray-100 border border-gray-300 text-sm font-bold text-foreground hover:bg-gray-200 transition-colors disabled:opacity-50">
                {facePhase === "instruct" ? "Step back..." : facePhase === "countdown" ? "Get ready..." : facePhase === "capturing" ? "Capturing..." : "📷 Capture Photo"}
              </button>
              <p className="text-[11px] text-gray-400">Look at the camera, we will take your photo</p>
            </div>
          )}
          {faceErr && <p className="text-xs text-red-500 text-center">{faceErr}</p>}

          {(["name", "dob", "sex", "address", "contact_number"] as const).map((field) => (
            <div key={field}>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {field === "dob" ? "Date of Birth (YYYY-MM-DD)" : field.replace("_", " ")}
              </label>
              {field === "sex" ? (
                <select value={newForm.sex} onChange={(e) => setNewForm({ ...newForm, sex: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              ) : (
                <input type={field === "dob" ? "date" : "text"} value={newForm[field]}
                  onChange={(e) => setNewForm({ ...newForm, [field]: e.target.value })}
                  placeholder={field === "dob" ? "YYYY-MM-DD" : field === "contact_number" ? "+63" : ""}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
              )}
            </div>
          ))}
          <button onClick={createPatient} disabled={loading || !newForm.name || !newForm.dob}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:bg-gray-300">
            {loading ? "Registering..." : "Register Patient"}
          </button>
        </Card>
        <CountdownOverlay number={faceCount} show={facePhase === "countdown"} />
      </div>
    )
  }

  if (pageState === "verify") {
    return (
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 max-w-xl mx-auto w-full overflow-y-auto overflow-x-hidden">
        <button onClick={() => setPageState(query.length >= 2 ? "results" : "search")}
          className="text-xs text-gray-500 hover:text-foreground transition-colors self-start">
          &larr; Back
        </button>
        <Card padding="md" className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-gray-500">Verify identity</p>
          <p className="text-lg font-semibold text-foreground">
            {[...results, ...records].find((r) => r.id === selectedId)?.name}
          </p>
          <div className="w-full">
            <input type="date" value={verifyDob}
              onChange={(e) => setVerifyDob(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
          </div>
          {verifyError && <p className="text-xs text-red-500">{verifyError}</p>}
          <button onClick={verifyPatient} disabled={loading || !verifyDob}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:bg-gray-300">
            {loading ? "Verifying..." : "Verify & Open Record"}
          </button>
        </Card>
      </div>
    )
  }

  const patientRow = (r: PatientSummary) => (
    <button key={r.id} onClick={() => selectPatient(r.id)}
      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      {r.photo ? (
        <img src={`data:image/jpeg;base64,${r.photo}`} alt={r.name}
          className="w-10 h-10 shrink-0 rounded-full object-cover border border-gray-200" />
      ) : (
        <span className="w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center shrink-0">
          {r.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
        <p className="text-xs text-gray-500">{r.sex} &middot; Age {calcAge(r.dob)} &middot; DOB: {formatDate(r.dob)}</p>
      </div>
    </button>
  )

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 max-w-xl mx-auto w-full overflow-hidden">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Patient Records</h2>
        <p className="text-sm text-gray-500">Search for a patient or register a new one</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input type="search" value={query} placeholder="Search by name..."
            onChange={(e) => doSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm shadow-sm" />
        </div>
        <button onClick={() => setPageState("new-patient")}
          className="shrink-0 px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors">
          + New Patient
        </button>
      </div>

      {loading && query.length >= 2 && (
        <p className="text-sm text-gray-400 text-center py-4">Searching...</p>
      )}

      {pageState === "results" && results.length > 0 && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-card dark:bg-card-dark">
          {results.map(patientRow)}
        </div>
      )}

      {pageState === "search" && !query && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Recent Patients</p>
          {records.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No patients yet.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-card dark:bg-card-dark">
              {records.map(patientRow)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PatientPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <PatientInner />
    </Suspense>
  )
}
