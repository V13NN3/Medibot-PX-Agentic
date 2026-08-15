"use client"

import type { ReactNode } from "react"

export function KioskFit({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col">
      {children}
    </div>
  )
}