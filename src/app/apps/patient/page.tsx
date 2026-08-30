"use client"

import { useState, useCallback, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { CountdownOverlay } from "@/components/countdown-overlay"
import { speak } from "@/lib/tts"
import { fetchStreamFrame, captureStillFrame } from "@/lib/camera-utils"

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

interface AiDraftForm {
  name?: string
  dob?: string
  sex?: string
  address?: string
  contact_number?: string
}

const FILL_FIELDS: Array<{ key: keyof AiDraftForm; label: string }> = [
  { key: "name", label: "Name" },
  { key: "dob", label: "Date of Birth" },
  { key: "sex", label: "Sex" },
  { key: "address", label: "Address" },
  { key: "contact_number", label: "Contact" },
]

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const CURRENT_YEAR = new Date().getFullYear()

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
  const faceVideoRef = useRef<HTMLVideoElement>(null)
  const faceImgRef = useRef<HTMLImageElement>(null)
  const faceStreamRef = useRef<MediaStream | null>(null)
  const [piCamera, setPiCamera] = useState<boolean | null>(null)

  useEffect(() => {
    setPiCamera(window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1")
  }, [])

  const startFaceStream = async () => {
    if (faceStreamRef.current) return
    const s = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
    })
    faceStreamRef.current = s
    if (faceVideoRef.current) {
      faceVideoRef.current.srcObject = s
      await faceVideoRef.current.play().catch(() => {})
    }
  }

  const stopFaceStream = () => {
    faceStreamRef.current?.getTracks().forEach((t) => t.stop())
    faceStreamRef.current = null
  }

  useEffect(() => {
    return () => stopFaceStream()
  }, [])
  const [initialized, setInitialized] = useState(false)
  const [aiFill, setAiFill] = useState({ active: false, filledCount: 0 })
  const aiTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  const captureFace = async () => {
    if (facePhase !== "idle") return
    setFaceErr("")
    setFacePhase("instruct")
    speak("Please look at the camera. Your photo will be taken when the countdown ends.")

    if (piCamera) {
      await new Promise((r) => setTimeout(r, 2500))
      setFacePhase("countdown")
      speak("Look at the camera. Get ready. Three, two, one.")
      for (let n = 3; n >= 1; n--) {
        setFaceCount(n)
        await new Promise((r) => setTimeout(r, 1000))
      }
      speak("Look at the camera and hold still.")
      setFacePhase("idle")
      await new Promise((r) => setTimeout(r, 1500))
      try {
        setFacePhase("capturing")
        const base64 = await captureStillFrame("/api/camera/capture")
        setNewForm((prev) => ({ ...prev, photo: base64 }))
      } catch {
        setFaceErr("Capture failed")
      } finally {
        setFacePhase("idle")
      }
      return
    }

    try {
      await startFaceStream()
    } catch {
      setFacePhase("idle")
      setFaceErr("Camera unavailable")
      return
    }
    await new Promise((r) => setTimeout(r, 2500))
    setFacePhase("countdown")
    speak("Look at the camera. Get ready. Three, two, one.")
    for (let n = 3; n >= 1; n--) {
      setFaceCount(n)
      await new Promise((r) => setTimeout(r, 1000))
    }
    setFacePhase("capturing")
    speak("Look at the camera and hold still.")
    try {
      const video = faceVideoRef.current
      if (!video) throw new Error("no video")
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth || 480
      canvas.height = video.videoHeight || 640
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("no ctx")
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1]
      setNewForm((prev) => ({ ...prev, photo: base64 }))
    } catch {
      setFaceErr("Capture failed")
    } finally {
      stopFaceStream()
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

  const startAiFill = useCallback(
    (form: AiDraftForm, patient: PatientDetail) => {
      setAiFill({ active: true, filledCount: 0 })
      setNewForm({
        name: form.name || "",
        dob: form.dob || "",
        sex: form.sex || "Male",
        address: form.address || "",
        contact_number: form.contact_number || "",
        photo: "",
      })
      setPageState("new-patient")

      aiTimers.current.forEach((t) => clearTimeout(t))
      aiTimers.current = []

      const total = FILL_FIELDS.filter((f) => form[f.key]).length
      FILL_FIELDS.forEach((field, i) => {
        if (!form[field.key]) return
        aiTimers.current.push(
          setTimeout(() => setAiFill((prev) => ({ ...prev, filledCount: i + 1 })), 600 * (i + 1)),
        )
      })
      aiTimers.current.push(
        setTimeout(() => {
          setAiFill((prev) => ({ ...prev, active: false }))
          setPatient(patient)
          setVitalsHistory([])
          setPageState("detail")
          loadRecords()
        }, 600 * total + 400),
      )
    },
    [loadRecords],
  )

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

  useEffect(() => {
    if (searchParams.get("new") !== "1") return
    try {
      const raw = sessionStorage.getItem("ai-patient-fields")
      if (raw) {
        const fields = JSON.parse(raw) as Record<string, string>
        sessionStorage.removeItem("ai-patient-fields")
        setNewForm((prev) => ({ ...prev, ...fields }))
        setPageState("new-patient")
      }
    } catch { /* ignore */ }
  }, [searchParams])

  useEffect(() => {
    const onFill = (e: Event) => {
      const detail = (e as CustomEvent).detail as { form?: AiDraftForm; patient?: PatientDetail } | undefined
      if (detail?.form && detail.patient) {
        startAiFill(detail.form, detail.patient)
      }
    }
    window.addEventListener("voice-create-patient", onFill)
    return () => {
      window.removeEventListener("voice-create-patient", onFill)
      aiTimers.current.forEach((t) => clearTimeout(t))
      aiTimers.current = []
    }
  }, [startAiFill])

  useEffect(() => {
    const onFieldFill = (e: Event) => {
      const detail = (e as CustomEvent).detail as { field?: string; value?: string } | undefined
      if (!detail?.field || detail.value === undefined) return
      setNewForm((prev) => ({ ...prev, [detail.field!]: detail.value! }))
      setPageState("new-patient")
    }
    window.addEventListener("voice-fill-patient-field", onFieldFill)
    return () => window.removeEventListener("voice-fill-patient-field", onFieldFill)
  }, [])

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

  const dobYear = newForm.dob ? Number(newForm.dob.slice(0, 4)) : 0
  const dobMonth = newForm.dob ? Number(newForm.dob.slice(5, 7)) : 0
  const dobDay = newForm.dob ? Number(newForm.dob.slice(8, 10)) : 0

  const setDobPart = (part: "year" | "month" | "day", value: string) => {
    const y = part === "year" ? value : dobYear ? String(dobYear) : ""
    const m = part === "month" ? value : dobMonth ? String(dobMonth) : ""
    const d = part === "day" ? value : dobDay ? String(dobDay) : ""
    const dim = m ? new Date(Number(y || 2000), Number(m), 0).getDate() : 31
    const dd = d && Number(d) <= dim ? d : ""
    const dob = y && m && dd ? `${y}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}` : ""
    setNewForm((prev) => ({ ...prev, dob }))
  }

  if (pageState === "detail" && patient) {
    return (
      <div className="flex-1 flex flex-col p-3 md:p-4 gap-2 max-w-xl mx-auto w-full overflow-y-auto overflow-x-hidden">
        <button onClick={() => { setPageState("search"); setPatient(null); setResults([]); setQuery("") }}
          className="text-xs text-gray-500 hover:text-foreground transition-colors self-start">
          &larr; Back to search
        </button>

        <Card className="flex items-center gap-3" padding="md">
          {patient.photo ? (
            <img src={`data:image/jpeg;base64,${patient.photo}`} alt={patient.name}
              className="w-12 h-12 shrink-0 rounded-full object-cover border border-gray-200" />
          ) : (
            <div className="w-12 h-12 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold">
              {patient.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              ID {patient.id.slice(0, 8)} &middot; Age {calcAge(patient.dob)} &middot; {patient.sex}
            </p>
            <h2 className="text-lg font-semibold text-foreground truncate">{patient.name}</h2>
            <p className="text-xs text-gray-500">DOB: {formatDate(patient.dob)}</p>
          </div>
        </Card>

        {patient.address || patient.contact_number ? (
          <Card padding="md" className="py-2">
            <div className="grid grid-cols-2 gap-1 text-sm">
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

        <Card padding="md" className="py-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">Vitals History</h3>
            <button onClick={goToVitals}
              className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors">
              Record Vitals &rarr;
            </button>
          </div>
          {vitalsHistory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">
              No vitals recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {vitalsHistory.map((v) => (
                <div key={v.id} className="py-1.5 flex items-center justify-between text-sm">
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
      <div className="flex-1 flex flex-col p-3 md:p-4 gap-2 max-w-xl mx-auto w-full overflow-y-auto overflow-x-hidden">
        <button onClick={() => setPageState("search")}
          className="text-xs text-gray-500 hover:text-foreground transition-colors self-start">
          &larr; Back
        </button>
        <div>
          <h2 className="text-lg font-semibold text-foreground">New Patient</h2>
          <p className="text-xs text-gray-500">Register a new patient</p>
        </div>
        <Card padding="md" className="flex flex-col gap-2 py-3">
          {(facePhase === "instruct" || facePhase === "countdown") && (
            <div className="rounded-xl overflow-hidden bg-black border border-gray-200">
              {piCamera ? (
                <img ref={faceImgRef} src="/api/camera/stream" alt="Pi camera" className="w-full max-h-48 object-cover" />
              ) : (
                <video ref={faceVideoRef} autoPlay playsInline muted className="w-full max-h-48 object-cover" />
              )}
            </div>
          )}
          {newForm.photo ? (
            <div className="flex flex-col items-center gap-1.5">
              <img src={`data:image/jpeg;base64,${newForm.photo}`} alt="Patient face"
                className="w-20 h-20 rounded-full object-cover border-2 border-primary" />
              <button onClick={captureFace} disabled={facePhase !== "idle"}
                className="px-4 py-1.5 rounded-lg bg-gray-100 border border-gray-300 text-xs font-bold text-foreground hover:bg-gray-200 transition-colors disabled:opacity-50">
                {facePhase === "instruct" ? "Look at the camera..." : facePhase === "countdown" ? "Get ready..." : facePhase === "capturing" ? "Capturing..." : "Re-capture Photo"}
              </button>
              <p className="text-[11px] text-gray-400 text-center">A face photo is required for your record.<br />It will remain private and confidential.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <button onClick={captureFace} disabled={facePhase !== "idle"}
                className="px-5 py-2 rounded-xl bg-gray-100 border border-gray-300 text-sm font-bold text-foreground hover:bg-gray-200 transition-colors disabled:opacity-50">
                {facePhase === "instruct" ? "Look at the camera..." : facePhase === "countdown" ? "Get ready..." : facePhase === "capturing" ? "Capturing..." : "📷 Capture Photo"}
              </button>
              <p className="text-[11px] text-gray-400 text-center">
                A face photo is required for your record.<br />It will remain private and confidential.<br />Look at the camera when the 3-second countdown ends.
              </p>
            </div>
          )}
          {faceErr && <p className="text-xs text-red-500 text-center">{faceErr}</p>}

          {aiFill.active && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-primary bg-blue-50 p-2">
              <p className="text-xs font-semibold text-primary">AI is filling the form for you...</p>
              <div className="flex flex-wrap gap-1.5">
                {FILL_FIELDS.map((field, i) => {
                  const filled = i < aiFill.filledCount
                  const value = newForm[field.key]
                  return (
                    <span key={field.key}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider ${filled && value ? "bg-success/20 text-success" : "bg-gray-100 text-gray-400"}`}>
                      {filled && value ? value : field.label}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {(["name", "dob", "sex", "address", "contact_number"] as const).map((field) => (
            <div key={field}>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                {field === "dob" ? "Date of Birth" : field.replace("_", " ")}
              </label>
              {field === "sex" ? (
                <select value={newForm.sex} onChange={(e) => setNewForm({ ...newForm, sex: e.target.value })}
                  className="w-full mt-0.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              ) : field === "dob" ? (
                <div className="flex gap-1.5 mt-0.5">
                  <select value={dobYear ? String(dobYear) : ""} onChange={(e) => setDobPart("year", e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
                    <option value="">Year</option>
                    {Array.from({ length: CURRENT_YEAR - 1919 }, (_, i) => CURRENT_YEAR - i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <select value={dobMonth ? String(dobMonth) : ""} onChange={(e) => setDobPart("month", e.target.value)}
                    className="w-24 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
                    <option value="">Month</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <select value={dobDay ? String(dobDay) : ""} onChange={(e) => setDobPart("day", e.target.value)}
                    className="w-20 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
                    <option value="">Day</option>
                    {Array.from({ length: dobMonth ? new Date(dobYear || 2000, dobMonth, 0).getDate() : 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <input type="text" value={newForm[field]}
                  onChange={(e) => setNewForm({ ...newForm, [field]: e.target.value })}
                  placeholder={field === "contact_number" ? "+63" : ""}
                  className="w-full mt-0.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
              )}
            </div>
          ))}
          <button onClick={createPatient} disabled={loading || aiFill.active || !newForm.name || !newForm.dob}
            className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:bg-gray-300">
            {loading ? "Registering..." : "Register Patient"}
          </button>
        </Card>
        <CountdownOverlay number={faceCount} show={facePhase === "countdown"} caption="Look at the camera" />
      </div>
    )
  }

  if (pageState === "verify") {
    return (
      <div className="flex-1 flex flex-col p-3 md:p-4 gap-2 max-w-xl mx-auto w-full overflow-y-auto overflow-x-hidden">
        <button onClick={() => setPageState(query.length >= 2 ? "results" : "search")}
          className="text-xs text-gray-500 hover:text-foreground transition-colors self-start">
          &larr; Back
        </button>
        <Card padding="md" className="flex flex-col items-center gap-3 text-center py-4">
          <p className="text-sm text-gray-500">Verify identity</p>
          <p className="text-lg font-semibold text-foreground">
            {[...results, ...records].find((r) => r.id === selectedId)?.name}
          </p>
          <div className="w-full">
            <input type="date" value={verifyDob}
              onChange={(e) => setVerifyDob(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
          </div>
          {verifyError && <p className="text-xs text-red-500">{verifyError}</p>}
          <button onClick={verifyPatient} disabled={loading || !verifyDob}
            className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:bg-gray-300">
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
    <div className="flex-1 flex flex-col p-3 md:p-4 gap-2 max-w-xl mx-auto w-full overflow-hidden">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Patient Records</h2>
        <p className="text-xs text-gray-500">Search for a patient or register a new one</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input type="search" value={query} placeholder="Search by name..."
            onChange={(e) => doSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm shadow-sm" />
        </div>
        <button onClick={() => setPageState("new-patient")}
          className="shrink-0 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors">
          + New Patient
        </button>
      </div>

      {loading && query.length >= 2 && (
        <p className="text-sm text-gray-400 text-center py-2">Searching...</p>
      )}

      {pageState === "results" && results.length > 0 && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-card dark:bg-card-dark">
          {results.map(patientRow)}
        </div>
      )}

      {pageState === "search" && !query && (
        <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-y-auto">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Recent Patients</p>
          {records.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No patients yet.</p>
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
