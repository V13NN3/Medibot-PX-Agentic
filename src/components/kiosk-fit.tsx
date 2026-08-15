"use client"

import { useEffect, useState, type ReactNode } from "react"

export function KioskFit({ children }: { children: ReactNode }) {
  const [topInset, setTopInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setTopInset(Math.max(0, vv.offsetTop))
    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    window.addEventListener("resize", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  return (
    <div
      className="h-full w-full overflow-hidden flex flex-col"
      style={{ paddingTop: topInset }}
    >
      {children}
    </div>
  )
}