import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { StatTile } from "@/components/dashboard/stat-tile"
import { ScheduleList } from "@/components/dashboard/schedule-list"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { nextCheckup, scheduleItems } from "@/lib/mock-schedule"

const callHistory = [
  { id: "call-1", senderName: "Dr. Hanzer Jon", senderInitials: "HJ", snippet: "call ended after 14 minutes", timestamp: "3 days ago" },
  { id: "call-2", senderName: "Dr. Steve Alex", senderInitials: "SA", snippet: "sent you a follow-up message", timestamp: "1 week ago" },
]

export default function TelehealthAppPage() {
  return (
    <DashboardShell>
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Telehealth</h2>
        <p className="text-sm text-gray-500">Video call with your doctor &amp; stream vitals</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl">
        <StatTile label="Connection" value="Stable" accent="success" />
        <StatTile label="Heart Rate" value={78} unit="bpm" accent="danger" trend={[74, 76, 75, 78, 77, 78]} />
        <StatTile label="Call Quality" value="HD" accent="teal" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start max-w-3xl">
        <ScheduleList title="Upcoming Consults" nextCheckup={nextCheckup} items={scheduleItems} ctaLabel="Join Call" />
        <ActivityFeed title="Call History" items={callHistory} />
      </div>
    </DashboardShell>
  )
}
