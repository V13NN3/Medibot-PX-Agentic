import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { ScheduleList } from "@/components/dashboard/schedule-list"
import { doctors } from "@/lib/mock-schedule"

const directoryItems = doctors.map((doctor) => ({
  id: `dir-${doctor.id}`,
  doctor,
  date: "Available now",
  time: "",
}))

export default function FindDoctorAppPage() {
  return (
    <DashboardShell>
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Find My Doctor</h2>
        <p className="text-sm text-gray-500">Find your doctor or get assigned an available one</p>
      </div>

      <div className="max-w-xl">
        <ScheduleList title="Available Doctors" items={directoryItems} ctaLabel="Select Doctor" />
      </div>
    </DashboardShell>
  )
}
