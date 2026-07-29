import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { StatTile } from "@/components/dashboard/stat-tile"
import { TaskChecklist } from "@/components/dashboard/task-checklist"
import { ActivityFeed } from "@/components/dashboard/activity-feed"

const queueTasks = [
  { id: "q-1", label: "Check in at the front desk", dueIn: "Now" },
  { id: "q-2", label: "Complete the intake form", dueIn: "Before called" },
  { id: "q-3", label: "Wait for your number to be called", dueIn: "In progress" },
]

const queueHistory = [
  { id: "qh-1", senderName: "Queue", senderInitials: "Q", snippet: "ticket A-041 was called to Room 3", timestamp: "8 min ago" },
  { id: "qh-2", senderName: "Queue", senderInitials: "Q", snippet: "ticket A-040 completed check-in", timestamp: "22 min ago" },
]

export default function QueueAppPage() {
  return (
    <DashboardShell>
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Queue</h2>
        <p className="text-sm text-gray-500">Get a queue number &amp; print ticket</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl">
        <StatTile label="Your Number" value="A-042" accent="primary" />
        <StatTile label="Now Serving" value="A-039" accent="teal" />
        <StatTile label="Est. Wait" value={12} unit="min" accent="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start max-w-3xl">
        <TaskChecklist tasks={queueTasks} />
        <ActivityFeed title="Recent Calls" items={queueHistory} />
      </div>
    </DashboardShell>
  )
}
