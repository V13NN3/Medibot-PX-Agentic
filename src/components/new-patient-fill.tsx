"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function NewPatientFill() {
  const router = useRouter()

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
      if (!window.location.pathname.startsWith("/apps/patient")) {
        router.push("/apps/patient?new=1")
      }
    }

    window.addEventListener("voice-create-patient", onFill)
    return () => window.removeEventListener("voice-create-patient", onFill)
  }, [router])

  return null
}