import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { HeartDiagram } from "@/components/dashboard/heart-diagram"
import { StatTile } from "@/components/dashboard/stat-tile"
import { ScheduleList } from "@/components/dashboard/schedule-list"
import { OrganRow } from "@/components/dashboard/organ-row"
import { heartHotspots, heartRateTrend, bodyConditions } from "@/lib/mock-patient"
import { nextCheckup, scheduleItems } from "@/lib/mock-schedule"

export default function DiagnosticsAppPage() {
  return (
    <DashboardShell>
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Overview Conditions</h2>
        <p className="text-sm text-gray-500">Simple patient diagnostic assistant</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="flex flex-col gap-4">
          <HeartDiagram hotspots={heartHotspots} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile label="Blood Status" value="116/70" accent="primary" trend={[70, 72, 68, 74, 71, 70]} />
            <StatTile label="Heart Rate" value={120} unit="bpm" accent="danger" trend={heartRateTrend} />
            <StatTile label="Blood Count" value="80/90" accent="teal" trend={[82, 85, 80, 88, 84, 90]} />
            <StatTile label="Glucose Level" value={93} unit="mg/dL" accent="warning" trend={[88, 90, 93, 91, 95, 93]} />
          </div>
        </div>

        <ScheduleList nextCheckup={nextCheckup} items={scheduleItems} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">My Body Condition</h3>
        <OrganRow conditions={bodyConditions} />
      </div>
    </DashboardShell>
  )
}
