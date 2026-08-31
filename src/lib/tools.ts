export type ToolHandler = (args: Record<string, unknown>) => Promise<string>

const API_BASE = typeof window !== "undefined" ? "" : "http://localhost:3000"

async function apiPost(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function apiGet(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}${path}`)
  return res.json()
}

export const toolDefinitions = [
  {
    type: "function",
    name: "search_patients",
    description: "Search for patients by name. Returns a list of matching patients. Use this first when the patient gives their name, then ask for DOB if multiple results.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Patient's full name or partial name to search" },
      },
      required: ["name"],
    },
  },
  {
    type: "function",
    name: "lookup_patient",
    description: "Look up an existing patient by name AND date of birth for exact match. Use after search_patients to verify identity.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Patient's full name" },
        dob: { type: "string", description: "Patient's date of birth (YYYY-MM-DD)" },
      },
      required: ["name", "dob"],
    },
  },
  {
    type: "function",
    name: "fill_patient_field",
    description: "Fill a single field on the patient registration form in real-time. Use this to fill fields one-by-one as you collect information from the patient. Call navigate_to('patient') first to open the form, then call this for each piece of information the patient gives you.",
    parameters: {
      type: "object",
      properties: {
        field: {
          type: "string",
          enum: ["name", "dob", "sex", "address", "contact_number"],
          description: "Which field to fill",
        },
        value: { type: "string", description: "The value to fill in the field" },
      },
      required: ["field", "value"],
    },
  },
  {
    type: "function",
    name: "create_patient",
    description: "Save the patient record to the database. Call this ONLY after all required fields (name, dob, sex) have been filled using fill_patient_field.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Patient's full name" },
        dob: { type: "string", description: "Date of birth (YYYY-MM-DD)" },
        sex: { type: "string", enum: ["Male", "Female"] },
        address: { type: "string", description: "Home address" },
        contact_number: { type: "string", description: "Contact number" },
      },
      required: ["name", "dob", "sex"],
    },
  },
  {
    type: "function",
    name: "read_vitals",
    description: "Read patient vitals from connected sensors (weight, height, temperature, oxygen saturation, heart rate)",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "measure_vital",
    description: "Trigger a single vitals measurement on the Vitals app (weight scale, height, temperature, oxygen, or heart rate). Call this while guiding the patient through each measurement step.",
    parameters: {
      type: "object",
      properties: {
        measurement: {
          type: "string",
          enum: ["weight", "height", "temperature", "oxygen", "heart_rate"],
          description: "Which measurement to take",
        },
      },
      required: ["measurement"],
    },
  },
  {
    type: "function",
    name: "find_doctor",
    description: "Search for available doctors by name or specialty",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Doctor name or specialty to search for" },
      },
      required: ["query"],
    },
  },
  {
    type: "function",
    name: "get_queue_number",
    description: "Get a queue number for the patient and print their ticket. Requires patient_name and doctor_name from the workflow context.",
    parameters: {
      type: "object",
      properties: {
        patient_name: { type: "string", description: "Patient's full name from step 1" },
        doctor_name: { type: "string", description: "Doctor's full name from step 3" },
      },
      required: ["patient_name", "doctor_name"],
    },
  },
  {
    type: "function",
    name: "check_now_serving",
    description: "Check the current 'Now Serving' number",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "book_appointment",
    description: "Book an appointment with a doctor directly. Collect patient name, doctor name, date, time, and reason from the patient first, then call this.",
    parameters: {
      type: "object",
      properties: {
        patient_name: { type: "string", description: "Patient's full name" },
        doctor_name: { type: "string", description: "Doctor's full name to search for and book with" },
        date: { type: "string", description: "Appointment date (YYYY-MM-DD)" },
        time: { type: "string", description: "Appointment time (e.g., 9:30 AM)" },
        reason: { type: "string", description: "Reason for the appointment" },
      },
      required: ["patient_name", "doctor_name", "date", "time"],
    },
  },
  {
    type: "function",
    name: "capture_lab_photo",
    description: "Trigger the camera to capture a photo of the lab result paper that the patient is holding up. Use this after telling the patient to hold their paper up to the camera.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "interpret_lab_results",
    description: "Interpret the captured lab result image and explain the values to the patient. Call this after capture_lab_photo succeeds.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "log_symptom_check",
    description: "Log a symptom check conversation after discussing symptoms with the patient. Call this after the patient describes their symptoms and you've given information.",
    parameters: {
      type: "object",
      properties: {
        symptoms: { type: "string", description: "The symptoms the patient described" },
        response: { type: "string", description: "Your response/advice about the symptoms" },
      },
      required: ["symptoms", "response"],
    },
  },
  {
    type: "function",
    name: "navigate_to",
    description: "Navigate the screen to a specific app page, optionally with a search term to auto-fill",
    parameters: {
      type: "object",
      properties: {
        app: {
          type: "string",
          enum: ["patient", "vitals", "diagnostics", "find-doctor", "queue", "appointment", "labs", "rx", "telehealth", "settings", "home"],
          description: "The app page to navigate to",
        },
        search: {
          type: "string",
          description: "Optional search term to auto-fill in the page's search field (e.g., patient name)",
        },
      },
      required: ["app"],
    },
  },
]

export const toolHandlers: Record<string, ToolHandler> = {
  search_patients: async (args) => {
    const name = encodeURIComponent(String(args.name || ""))
    const data = await apiGet(`/api/patient/search?q=${name}`)
    return JSON.stringify(data)
  },

  lookup_patient: async (args) => {
    const data = await apiPost("/api/patient/lookup", args)
    return JSON.stringify(data)
  },

  fill_patient_field: async (args) => {
    const field = String(args.field || "")
    const value = String(args.value || "")
    if (typeof window !== "undefined") {
      try {
        const raw = window.sessionStorage.getItem("ai-patient-fields")
        const fields = raw ? JSON.parse(raw) : {}
        fields[field] = value
        window.sessionStorage.setItem("ai-patient-fields", JSON.stringify(fields))
      } catch { /* ignore */ }
      window.dispatchEvent(
        new CustomEvent("voice-fill-patient-field", {
          detail: { field, value },
        }),
      )
    }
    return JSON.stringify({ filled: true, field, value })
  },

  create_patient: async (args) => {
    const data = await apiPost("/api/patient/create", args)
    if (typeof window !== "undefined") {
      try { window.sessionStorage.removeItem("ai-patient-fields") } catch { /* ignore */ }
      window.dispatchEvent(
        new CustomEvent("voice-create-patient", {
          detail: { patient: data.patient, form: args },
        }),
      )
    }
    return JSON.stringify(data)
  },

  read_vitals: async () => {
    const data = await apiGet("/api/vitals/read")
    return JSON.stringify(data)
  },

  measure_vital: async (args) => {
    const measurement = String(args.measurement || "all")
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("measure-vital", { detail: { measurement } }))
    }

    if (measurement === "height") {
      const heightRes = (await apiPost("/api/vitals/height", {})) as {
        height_cm?: number
        confidence?: number
        _source?: string
        image_base64?: string
      }
      const readRes = (await apiGet("/api/vitals/read")) as Record<string, unknown>
      const reading = { ...readRes, height_cm: heightRes.height_cm, image_base64: heightRes.image_base64 }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("vitals-reading", { detail: { reading } }))
      }
      return JSON.stringify({ ...reading, _source: heightRes._source || "vision-ai" })
    }

    if (measurement === "oxygen") {
      const o2Res = (await apiGet("/api/vitals/o2")) as { o2_percentage?: number; raw_adc?: number }
      const readRes = (await apiGet("/api/vitals/read")) as Record<string, unknown>
      const reading = { ...readRes, oxygen_saturation: o2Res.o2_percentage ?? readRes.oxygen_saturation }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("vitals-reading", { detail: { reading } }))
      }
      return JSON.stringify(reading)
    }

    if (measurement === "heart_rate") {
      const hrRes = (await apiGet("/api/vitals/heartrate")) as { heart_rate?: number; raw_adc?: number }
      const readRes = (await apiGet("/api/vitals/read")) as Record<string, unknown>
      const reading = { ...readRes, heart_rate: hrRes.heart_rate ?? readRes.heart_rate }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("vitals-reading", { detail: { reading } }))
      }
      return JSON.stringify(reading)
    }

    const data = await apiGet("/api/vitals/read")
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("vitals-reading", { detail: { reading: data } }))
    }
    return JSON.stringify(data)
  },

  find_doctor: async (args) => {
    const query = encodeURIComponent(String(args.query || ""))
    const data = await apiGet(`/api/doctors/search?q=${query}`)
    return JSON.stringify(data)
  },

  get_queue_number: async (args) => {
    const patientName = String(args.patient_name || "")
    const doctorName = String(args.doctor_name || "")

    let doctorId = ""
    if (doctorName) {
      const docRes = await apiGet(`/api/doctors/search?q=${encodeURIComponent(doctorName)}`)
      const docs = (docRes.doctors || []) as Array<{ id: string; name: string }>
      if (docs.length > 0) doctorId = docs[0].id
    }

    const data = await apiPost("/api/queue/next", { patient_name: patientName, doctor_id: doctorId })
    if (data.formatted) {
      const now = new Date()
      const phTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
      const date = phTime.toISOString().slice(0, 10)
      const time = phTime.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })
      apiPost("/api/queue/print", { number: data.formatted, date, time })
    }
    return JSON.stringify(data)
  },

  check_now_serving: async () => {
    const data = await apiGet("/api/queue/serving")
    return JSON.stringify(data)
  },

  book_appointment: async (args) => {
    const doctorName = String(args.doctor_name || "")
    const docRes = await apiGet(`/api/doctors/search?q=${encodeURIComponent(doctorName)}`)
    const doctors = (docRes.doctors || []) as Array<{ id: string; name: string }>
    const doctorId = doctors.length > 0 ? doctors[0].id : ""

    if (!doctorId) {
      return JSON.stringify({ error: `Doctor "${doctorName}" not found` })
    }

    const data = await apiPost("/api/appointments/create", {
      patient_name: String(args.patient_name || ""),
      doctor_id: doctorId,
      appointment_date: String(args.date || ""),
      appointment_time: String(args.time || ""),
      reason: String(args.reason || ""),
    })
    return JSON.stringify(data)
  },

  capture_lab_photo: async () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("capture-lab-photo"))
    }
    return JSON.stringify({ triggered: true })
  },

  interpret_lab_results: async () => {
    return JSON.stringify({ status: "processing" })
  },

  log_symptom_check: async (args) => {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem("lastSymptomCheck", JSON.stringify({
        symptoms: String(args.symptoms || ""),
        response: String(args.response || ""),
        disclaimer: true,
        timestamp: Date.now(),
      }))
    }
    return JSON.stringify({ logged: true })
  },

  navigate_to: async (args) => {
    const app = String(args.app || "")
    const params: Record<string, string> = {}
    if (args.search) params.search = String(args.search)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-app-overlay", { detail: { app, params } }))
    }
    return JSON.stringify({ navigated_to: app })
  },
}

export function getToolNames(): string[] {
  return toolDefinitions.map((t) => t.name)
}
