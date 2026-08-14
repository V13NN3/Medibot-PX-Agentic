"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

const DESIGN_WIDTH = parseInt(process.env.NEXT_PUBLIC_KIOSK_WIDTH || "1280", 10)
const DESIGN_HEIGHT = parseInt(process.env.NEXT_PUBLIC_KIOSK_HEIGHT || "800", 10)

export function KioskFit({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const apply = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      setScale(Math.min(vw / DESIGN_WIDTH, vh / DESIGN_HEIGHT))
    }
    apply()
    window.addEventListener("resize", apply)
    window.addEventListener("orientationchange", apply)
    return () => {
      window.removeEventListener("resize", apply)
      window.removeEventListener("orientationchange", apply)
    }
  }, [])

  return (
    <div ref={outerRef} className="fixed inset-0 overflow-hidden flex items-center justify-center">
      <div
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "center",
        }}
      >
        {children}
      </div>
    </div>
  )
}
