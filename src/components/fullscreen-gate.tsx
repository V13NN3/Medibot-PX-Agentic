"use client"

import { useEffect, useState } from "react"

export function FullscreenGate() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof document === "undefined") return
    const isTouch = window.matchMedia("(pointer: coarse)").matches
    const canFullscreen =
      typeof document.documentElement.requestFullscreen === "function" &&
      document.fullscreenEnabled
    if (isTouch && canFullscreen && !document.fullscreenElement) {
      setVisible(true)
    }
  }, [])

  useEffect(() => {
    const onChange = () => {
      if (document.fullscreenElement) setVisible(false)
    }
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const enter = async () => {
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      /* ignore — fall back to resizes-content viewport */
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="text-6xl">&#128241;</span>
        <p className="text-lg font-semibold text-white">
          Tap to enter fullscreen
        </p>
        <button
          type="button"
          onClick={enter}
          className="px-10 py-4 rounded-2xl bg-primary text-white text-lg font-semibold
                     shadow-lg active:scale-95 transition-transform cursor-pointer touch-manipulation"
        >
          Start
        </button>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-sm text-white/60 underline cursor-pointer touch-manipulation"
        >
          Continue without fullscreen
        </button>
      </div>
    </div>
  )
}