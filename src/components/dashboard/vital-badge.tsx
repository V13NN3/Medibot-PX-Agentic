import type { RangeStatus } from "@/types"
import { Card } from "@/components/ui/card"
import { Sparkline } from "@/components/ui/sparkline"

const statusColor: Record<RangeStatus, string> = {
  normal: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
}

const statusDot: Record<RangeStatus, string> = {
  normal: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
}

interface VitalBadgeProps {
  label: string
  value: string | number
  unit?: string
  trend?: number[]
  status?: RangeStatus
}

export function VitalBadge({ label, value, unit, trend, status = "normal" }: VitalBadgeProps) {
  return (
    <Card padding="sm" className="flex items-center gap-3 min-w-fit">
      <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[status]}`} />
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500 truncate">{label}</p>
        <p className="text-sm font-semibold text-foreground whitespace-nowrap">
          {value}
          {unit ? <span className="text-xs font-normal text-gray-400"> {unit}</span> : null}
        </p>
      </div>
      {trend && trend.length > 1 && (
        <Sparkline data={trend} width={48} height={20} color={statusColor[status]} />
      )}
    </Card>
  )
}
