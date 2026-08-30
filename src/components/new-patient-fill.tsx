"use client"

import { useEffect } from "react"
import { useAppOverlay } from "@/contexts/app-overlay-context"

export function NewPatientFill() {
  const { openApp } = useAppOverlay()

  useEffect(() => {
    const onFill = (e: Event) => {
      const detail = (e as CustomEvent).detail as { form?: unknown; patient?: unknown } | undefined
      try {
        sessionStorage.setItem(
          "ai-patient-draft",
          JSON.stringify({ form: detail?.form || {}, patient: detail?.patient || null }),
        )
      } catch {
        /* ignore */
      }
      openApp("patient", { new: "1" })
    }

    window.addEventListener("voice-create-patient", onFill)
    return () => window.removeEventListener("voice-create-patient", onFill)
  }, [openApp])

  return null
}
