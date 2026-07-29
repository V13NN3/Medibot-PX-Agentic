"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { ToggleSwitch } from "@/components/ui/toggle-switch"

interface ToolbarToggle {
  id: string
  label: string
  checked?: boolean
}

interface DashboardToolbarProps {
  toggles: ToolbarToggle[]
}

export function DashboardToolbar({ toggles }: DashboardToolbarProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    new Set(toggles.filter((t) => t.checked).map((t) => t.id)),
  )
  const [zoom, setZoom] = useState(1)

  function toggle(id: string, checked: boolean) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <Card padding="sm" className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4">
        {toggles.map((t) => (
          <div key={t.id} className="flex flex-col items-center gap-1">
            <span className="text-[11px] text-gray-500 text-center">{t.label}</span>
            <ToggleSwitch
              checked={checkedIds.has(t.id)}
              onChange={(checked) => toggle(t.id, checked)}
              leftLabel="0"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
          className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          −
        </button>
        <span className="text-xs text-gray-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
          className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          +
        </button>
      </div>
    </Card>
  )
}
