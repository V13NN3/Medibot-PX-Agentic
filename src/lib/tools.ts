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
    name: "lookup_patient",
    description: "Look up an existing patient by name and date of birth",
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
    name: "create_patient",
    description: "Register a new patient",
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
    name: "read_vitals",
    description: "Read patient vitals from connected sensors (weight, temperature, oxygen saturation, heart rate)",
    parameters: { type: "object", properties: {} },
  },
  {
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
    name: "get_queue_number",
    description: "Get a queue number for the patient and print their ticket",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "check_now_serving",
    description: "Check the current 'Now Serving' number",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "navigate_to",
    description: "Navigate the screen to a specific app page",
    parameters: {
      type: "object",
      properties: {
        app: {
          type: "string",
          enum: ["patient", "diagnostics", "find-doctor", "queue", "appointment", "labs", "telehealth", "settings", "home"],
          description: "The app page to navigate to",
        },
      },
      required: ["app"],
    },
  },
]

export const toolHandlers: Record<string, ToolHandler> = {
  lookup_patient: async (args) => {
    const data = await apiPost("/api/patient/lookup", args)
    return JSON.stringify(data)
  },

  create_patient: async (args) => {
    const data = await apiPost("/api/patient/create", args)
    return JSON.stringify(data)
  },

  read_vitals: async () => {
    const data = await apiGet("/api/vitals/read")
    return JSON.stringify(data)
  },

  find_doctor: async (args) => {
    const query = encodeURIComponent(String(args.query || ""))
    const data = await apiGet(`/api/doctors/search?q=${query}`)
    return JSON.stringify(data)
  },

  get_queue_number: async () => {
    const data = await apiGet("/api/queue/next")
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

  navigate_to: async (args) => {
    const app = String(args.app || "")
    const path = app === "home" ? "/" : `/apps/${app}`
    if (typeof window !== "undefined") {
      window.location.href = path
    }
    return JSON.stringify({ navigated_to: path })
  },
}

export function getToolNames(): string[] {
  return toolDefinitions.map((t) => t.name)
}
