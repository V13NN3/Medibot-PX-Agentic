import type { RangeStatus } from "@/types"
import { cn } from "@/lib/utils"

const statusRing: Record<RangeStatus, string> = {
  normal: "ring-success/40",
  warning: "ring-warning/40",
  danger: "ring-danger/40",
}

interface OrganCardProps {
  name: string
  icon: string
  status?: RangeStatus
  selected?: boolean
  onClick?: () => void
}

export function OrganCard({ name, icon, status = "normal", selected, onClick }: OrganCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 w-24 flex flex-col items-center gap-2 rounded-2xl bg-card dark:bg-card-dark border p-3 shadow-sm transition-all cursor-pointer",
        selected ? cn("ring-2", statusRing[status], "border-transparent") : "border-gray-100 dark:border-gray-800",
      )}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-medium text-foreground">{name}</span>
    </button>
  )
}
