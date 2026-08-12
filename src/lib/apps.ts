import type { AppDefinition } from "@/types"

export const apps: AppDefinition[] = [
  { id: "patient", name: "Patient Records", description: "Manage patient records", icon: "🧑‍⚕️", href: "/apps/patient" },
  { id: "queue", name: "Queue", description: "Get a queue number", icon: "🎫", href: "/apps/queue" },
  { id: "vitals", name: "Vitals", description: "Measure weight, height & temperature", icon: "⚖️", href: "/apps/vitals" },
  { id: "find-doctor", name: "Find My Doctor", description: "Find your doctor", icon: "🔍", href: "/apps/find-doctor" },
  { id: "telehealth", name: "Telehealth", description: "Video call your doctor", icon: "📹", href: "/apps/telehealth" },
  { id: "appointment", name: "Appointments", description: "Schedule an appointment", icon: "📅", href: "/apps/appointment" },
  { id: "labs", name: "Lab Results", description: "View X-rays & blood tests", icon: "🔬", href: "/apps/labs" },
  { id: "rx", name: "My Prescription", description: "View your prescription", icon: "💊", href: "/apps/rx" },
  { id: "diagnostics", name: "Diagnostics", description: "Symptom explorer", icon: "🩺", href: "/apps/diagnostics" },
  { id: "settings", name: "Settings", description: "Hardware & calibration", icon: "⚙️", href: "/apps/settings" },
]
