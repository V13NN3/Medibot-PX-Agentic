import type { ScheduleItem } from "@/types"
import { Card } from "@/components/ui/card"

interface ScheduleListProps {
  title?: string
  nextCheckup?: ScheduleItem
  items: ScheduleItem[]
  ctaLabel?: string
}

export function ScheduleList({ title = "My Schedule", nextCheckup, items, ctaLabel = "Consult Now" }: ScheduleListProps) {
  return (
    <Card padding="none" className="overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {nextCheckup && (
          <p className="text-xs text-gray-500 mt-0.5">
            Next: {nextCheckup.date} &middot; {nextCheckup.time}
          </p>
        )}
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="shrink-0 w-8 h-8 rounded-full bg-teal/10 text-teal text-xs font-semibold flex items-center justify-center">
              {item.doctor.avatarInitials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{item.doctor.name}</p>
              <p className="text-[11px] text-gray-400 truncate">{item.doctor.specialty}</p>
            </div>
            <span className="text-[11px] text-gray-400 whitespace-nowrap">{item.date}</span>
          </div>
        ))}
      </div>
      <div className="p-4 pt-3">
        <button
          type="button"
          className="w-full rounded-xl bg-primary text-white text-sm font-medium py-2.5 hover:bg-primary-dark transition-colors cursor-pointer"
        >
          {ctaLabel}
        </button>
      </div>
    </Card>
  )
}
