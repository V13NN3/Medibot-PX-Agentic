"use client"

import { useSearchParams } from "next/navigation"
import { useAppOverlay } from "@/contexts/app-overlay-context"

export function useAppParams() {
  const urlParams = useSearchParams()
  const { currentApp, appParams } = useAppOverlay()

  if (currentApp) {
    return {
      get: (key: string) => appParams[key] || null,
      has: (key: string) => key in appParams && appParams[key] !== "",
    }
  }

  return urlParams
}
