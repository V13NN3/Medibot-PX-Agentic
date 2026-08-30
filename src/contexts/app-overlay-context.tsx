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
    console.log("[overlay] opening:", app, params)
    setOverlay({ currentApp: app, appParams: params || {} })
  }, [])

  const closeApp = useCallback(() => {
    console.log("[overlay] closing")
    setOverlay({ currentApp: null, appParams: {} })
  }, [])

  const swapApp = useCallback((app: string, params?: Record<string, string>) => {
    console.log("[overlay] swapping to:", app, params)
    setOverlay({ currentApp: app, appParams: params || {} })
  }, [])

  return (
    <AppOverlayContext.Provider value={{ ...overlay, openApp, closeApp, swapApp }}>
      {children}
    </AppOverlayContext.Provider>
  )
}

export function useAppOverlay() {
  return useContext(AppOverlayContext)
}
