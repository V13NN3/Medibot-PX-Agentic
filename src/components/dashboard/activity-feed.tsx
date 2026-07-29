import type { ActivityItem } from "@/types"
import { Card } from "@/components/ui/card"

interface ActivityFeedProps {
  items: ActivityItem[]
  title?: string
}

export function ActivityFeed({ items, title = "Last activity" }: ActivityFeedProps) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 px-4 py-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
              {item.senderInitials}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-foreground">
                <span className="font-medium">{item.senderName}</span>{" "}
                <span className="text-gray-500 dark:text-gray-400">{item.snippet}</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{item.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
