"use client"

import { useEffect } from "react"
import dynamic from "next/dynamic"
import { useAppOverlay } from "@/contexts/app-overlay-context"

function OverlaySpinner() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  )
}

const PatientApp = dynamic(() => import("@/app/apps/patient/page"), { ssr: false, loading: () => <OverlaySpinner /> })
const VitalsApp = dynamic(() => import("@/app/apps/vitals/page"), { ssr: false, loading: () => <OverlaySpinner /> })
const LabsApp = dynamic(() => import("@/app/apps/labs/page"), { ssr: false, loading: () => <OverlaySpinner /> })
const DiagnosticsApp = dynamic(() => import("@/app/apps/diagnostics/page"), { ssr: false, loading: () => <OverlaySpinner /> })
const FindDoctorApp = dynamic(() => import("@/app/apps/find-doctor/page"), { ssr: false, loading: () => <OverlaySpinner /> })
const QueueApp = dynamic(() => import("@/app/apps/queue/page"), { ssr: false, loading: () => <OverlaySpinner /> })
const AppointmentApp = dynamic(() => import("@/app/apps/appointment/page"), { ssr: false, loading: () => <OverlaySpinner /> })
const TelehealthApp = dynamic(() => import("@/app/apps/telehealth/page"), { ssr: false, loading: () => <OverlaySpinner /> })
const RxApp = dynamic(() => import("@/app/apps/rx/page"), { ssr: false, loading: () => <OverlaySpinner /> })
const SettingsApp = dynamic(() => import("@/app/apps/settings/page"), { ssr: false, loading: () => <OverlaySpinner /> })

const APP_LABELS: Record<string, string> = {
  patient: "Patient Records",
  vitals: "Vitals Check",
  labs: "Lab Results",
  diagnostics: "Diagnostics",
  "find-doctor": "Find a Doctor",
  queue: "Queue",
  appointment: "Appointments",
  telehealth: "Telehealth",
  rx: "Prescriptions",
  settings: "Settings",
}

const APP_COMPONENTS: Record<string, React.ComponentType> = {
  patient: PatientApp,
  vitals: VitalsApp,
  labs: LabsApp,
  diagnostics: DiagnosticsApp,
  "find-doctor": FindDoctorApp,
  queue: QueueApp,
  appointment: AppointmentApp,
  telehealth: TelehealthApp,
  rx: RxApp,
  settings: SettingsApp,
}

export default function AppOverlay() {
  const { currentApp, openApp, closeApp } = useAppOverlay()

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { app: string; params?: Record<string, string> }
      if (detail?.app) {
        console.log("[overlay-component] event open-app-overlay:", detail.app)
        openApp(detail.app, detail.params)
      }
    }
    window.addEventListener("open-app-overlay", onOpen)
    return () => window.removeEventListener("open-app-overlay", onOpen)
  }, [openApp])

  console.log("[overlay-component] render, currentApp:", currentApp)

  if (!currentApp) return null

  const AppComponent = APP_COMPONENTS[currentApp]
  const label = APP_LABELS[currentApp] || currentApp

  if (!AppComponent) {
    console.warn("[overlay-component] unknown app:", currentApp)
    return null
  }

  console.log("[overlay-component] rendering app:", currentApp, "->", label)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-950 overlay-slide-in">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
        <button
          onClick={closeApp}
          className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
        <div className="w-12" />
      </div>
      <div className="flex-1 overflow-y-auto">
        <AppComponent />
      </div>
    </div>
  )
}
