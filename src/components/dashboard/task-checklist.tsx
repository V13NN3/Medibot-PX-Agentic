"use client"

import { useState } from "react"
import type { TaskItem } from "@/types"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface TaskChecklistProps {
  tasks: TaskItem[]
  onToggle?: (id: string) => void
}

export function TaskChecklist({ tasks, onToggle }: TaskChecklistProps) {
  const [doneIds, setDoneIds] = useState<Set<string>>(
    new Set(tasks.filter((t) => t.done).map((t) => t.id)),
  )

  function toggle(id: string) {
    setDoneIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    onToggle?.(id)
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-foreground">Tasks</h3>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
        {tasks.map((task) => {
          const done = doneIds.has(task.id)
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => toggle(task.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
            >
              <span
                className={cn(
                  "shrink-0 w-4 h-4 rounded border flex items-center justify-center",
                  done ? "bg-primary border-primary text-white" : "border-gray-300 dark:border-gray-600",
                )}
              >
                {done && "✓"}
              </span>
              <span className={cn("flex-1 text-sm", done ? "line-through text-gray-400" : "text-foreground")}>
                {task.label}
              </span>
              <span className="text-[11px] text-gray-400 shrink-0">{task.dueIn}</span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
