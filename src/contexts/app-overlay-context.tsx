"use client"

import { createContext, useCallback, useContext, useState } from "react"

interface AppOverlayState {
  currentApp: string | null
  appParams: Record<string, string>
}

interface AppOverlayValue extends AppOverlayState {
  openApp: (app: string, params?: Record<string, string>) => void
  closeApp: () => void
  swapApp: (app: string, params?: Record<string, string>) => void
}

const AppOverlayContext = createContext<AppOverlayValue>({
  currentApp: null,
  appParams: {},
  openApp: () => {},
  closeApp: () => {},
  swapApp: () => {},
})

export function AppOverlayProvider({ children }: { children: React.ReactNode }) {
  const [overlay, setOverlay] = useState<AppOverlayState>({
    currentApp: null,
    appParams: {},
  })

  const openApp = useCallback((app: string, params?: Record<string, string>) => {
    console.log("[overlay-ctx] openApp called:", app, "params:", params, "current state:", overlay.currentApp)
    setOverlay({ currentApp: app, appParams: params || {} })
    console.log("[overlay-ctx] state set to:", app)
  }, [])

  const closeApp = useCallback(() => {
    console.log("[overlay-ctx] closeApp called")
    setOverlay({ currentApp: null, appParams: {} })
  }, [])

  const swapApp = useCallback((app: string, params?: Record<string, string>) => {
    console.log("[overlay-ctx] swapApp called:", app)
    setOverlay({ currentApp: app, appParams: params || {} })
  }, [])

  console.log("[overlay-ctx] render, currentApp:", overlay.currentApp)

  return (
    <AppOverlayContext.Provider value={{ ...overlay, openApp, closeApp, swapApp }}>
      {children}
    </AppOverlayContext.Provider>
  )
}

export function useAppOverlay() {
  return useContext(AppOverlayContext)
}
