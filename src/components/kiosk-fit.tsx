"use client"

import type { ReactNode } from "react"

export function KioskFit({ children }: { children: ReactNode }) {
  return (
    <div className="h-full w-full overflow-hidden flex flex-col">
      {children}
    </div>
  )
}