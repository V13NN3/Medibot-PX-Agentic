"use client"

import { cn } from "@/lib/utils"

interface ToggleSwitchProps {
  checked: boolean
  onChange?: (checked: boolean) => void
  leftLabel?: string
  rightLabel?: string
  disabled?: boolean
}

export function ToggleSwitch({ checked, onChange, leftLabel, rightLabel, disabled }: ToggleSwitchProps) {
  return (
    <div className="flex items-center gap-2">
      {leftLabel && (
        <span className={cn("text-[11px] font-medium", checked ? "text-gray-400" : "text-primary")}>
          {leftLabel}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          "relative w-9 h-5 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-primary" : "bg-gray-300 dark:bg-gray-600",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-4",
          )}
        />
      </button>
      {rightLabel && (
        <span className={cn("text-[11px] font-medium", checked ? "text-primary" : "text-gray-400")}>
          {rightLabel}
        </span>
      )}
    </div>
  )
}
