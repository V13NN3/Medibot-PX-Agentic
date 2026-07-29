import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { ScheduleList } from "@/components/dashboard/schedule-list"
import { TaskChecklist } from "@/components/dashboard/task-checklist"
import { nextCheckup, scheduleItems } from "@/lib/mock-schedule"

const prepTasks = [
  { id: "prep-1", label: "Bring your insurance card", dueIn: "Before visit" },
  { id: "prep-2", label: "List current medications", dueIn: "Before visit" },
  { id: "prep-3", label: "Arrive 15 minutes early", dueIn: "Day of visit" },
]

export default function AppointmentAppPage() {
  return (
    <DashboardShell>
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Appointments</h2>
        <p className="text-sm text-gray-500">Schedule an appointment with your doctor</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start max-w-3xl">
        <ScheduleList
          title="Upcoming Appointments"
          nextCheckup={nextCheckup}
          items={scheduleItems}
          ctaLabel="Book Appointment"
        />
        <TaskChecklist tasks={prepTasks} />
      </div>
    </DashboardShell>
  )
}
