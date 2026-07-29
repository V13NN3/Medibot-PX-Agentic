"use client"

import { useState, type ReactNode } from "react"
import type { Hotspot, RangeStatus } from "@/types"
import { cn } from "@/lib/utils"

const statusDot: Record<RangeStatus, string> = {
  normal: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
}

interface HotspotDiagramProps {
  hotspots: Hotspot[]
  selectedId?: string
  onSelect?: (id: string) => void
  children: ReactNode
}

export function HotspotDiagram({ hotspots, selectedId: controlledId, onSelect, children }: HotspotDiagramProps) {
  const [internalId, setInternalId] = useState<string | undefined>(undefined)
  const selectedId = controlledId ?? internalId

  function handleSelect(id: string) {
    setInternalId(id)
    onSelect?.(id)
  }

  return (
    <div className="relative w-full aspect-square max-w-xs mx-auto">
      {children}
      {hotspots.map((h) => {
        const isSelected = selectedId === h.id
        return (
          <div
            key={h.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
          >
            <button
              type="button"
              onClick={() => handleSelect(h.id)}
              aria-label={h.label}
              className={cn(
                "block w-3 h-3 rounded-full ring-4 ring-white/70 dark:ring-black/40 transition-transform cursor-pointer",
                statusDot[h.status ?? "normal"],
                isSelected && "scale-150",
              )}
            />
            {isSelected && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 rounded-md bg-foreground text-background text-[11px] whitespace-nowrap shadow-lg z-10">
                {h.label}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
