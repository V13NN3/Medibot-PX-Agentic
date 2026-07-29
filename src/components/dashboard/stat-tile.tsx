import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { Sparkline } from "@/components/ui/sparkline"

const accentMap = {
  primary: { text: "text-primary", color: "var(--color-primary)" },
  teal: { text: "text-teal", color: "var(--color-teal)" },
  success: { text: "text-success", color: "var(--color-success)" },
  warning: { text: "text-warning", color: "var(--color-warning)" },
  danger: { text: "text-danger", color: "var(--color-danger)" },
}

interface StatTileProps {
  label: string
  value: string | number
  unit?: string
  trend?: number[]
  accent?: keyof typeof accentMap
  icon?: ReactNode
}

export function StatTile({ label, value, unit, trend, accent = "primary", icon }: StatTileProps) {
  const { text, color } = accentMap[accent]

  return (
    <Card className="flex flex-col gap-2" padding="md">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{label}</p>
        {icon && <span className={text}>{icon}</span>}
      </div>
      <p className="text-2xl font-semibold text-foreground">
        {value}
        {unit ? <span className="text-sm font-normal text-gray-400"> {unit}</span> : null}
      </p>
      {trend && trend.length > 1 && (
        <Sparkline data={trend} width={120} height={32} color={color} fill />
      )}
    </Card>
  )
}
