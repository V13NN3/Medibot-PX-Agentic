"use client"

import { useState } from "react"
import type { MedicalHistoryEntry } from "@/types"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MedicalHistoryTimelineProps {
  entries: MedicalHistoryEntry[]
  defaultExpandedId?: string
}

export function MedicalHistoryTimeline({ entries, defaultExpandedId }: MedicalHistoryTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | undefined>(defaultExpandedId ?? entries[0]?.id)

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-foreground">Medical history</h3>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800/60 max-h-[28rem] overflow-y-auto">
        {entries.map((entry) => {
          const isExpanded = expandedId === entry.id
          return (
            <div key={entry.id} className="px-4 py-3">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? undefined : entry.id)}
                className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400 font-mono">{entry.date}</p>
                  <p className="text-sm font-medium text-foreground truncate">{entry.condition}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-gray-400 transition-transform",
                    isExpanded && "rotate-180",
                  )}
                >
                  ▾
                </span>
              </button>
              {isExpanded && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {entry.symptoms.join(" · ")}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
