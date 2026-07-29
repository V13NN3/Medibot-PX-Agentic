import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { PatientHeader } from "@/components/dashboard/patient-header"
import { VitalBadge } from "@/components/dashboard/vital-badge"
import { BodyDiagram } from "@/components/dashboard/body-diagram"
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar"
import { MedicalHistoryTimeline } from "@/components/dashboard/medical-history-timeline"
import { TaskChecklist } from "@/components/dashboard/task-checklist"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { AnalysisTable } from "@/components/dashboard/analysis-table"
import { patient, vitals, medicalHistory, bodyHotspots } from "@/lib/mock-patient"
import { analysisRows } from "@/lib/mock-labs"
import { tasks, activity } from "@/lib/mock-activity"

export default function PatientAppPage() {
  return (
    <DashboardShell>
      <PatientHeader
        name={patient.name}
        patientId={patient.id}
        age={patient.age}
        sex={patient.sex}
        avatarInitials={patient.avatarInitials}
      />

      <div className="flex flex-wrap gap-3">
        <VitalBadge {...vitals.heartRate} />
        <VitalBadge {...vitals.brainActivity} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_320px] gap-6 items-start">
        <MedicalHistoryTimeline entries={medicalHistory} />

        <div className="flex flex-col gap-4">
          <BodyDiagram hotspots={bodyHotspots} />
          <DashboardToolbar
            toggles={[
              { id: "formezatol", label: "Formezatol Subscription" },
              { id: "aspirin", label: "Aspirin Subscription" },
              { id: "blood-test", label: "New Blood Test" },
              { id: "mri", label: "MRI New", checked: true },
            ]}
          />
        </div>

        <div className="flex flex-col gap-4">
          <TaskChecklist tasks={tasks} />
          <ActivityFeed items={activity} />
        </div>
      </div>

      <AnalysisTable rows={analysisRows} />
    </DashboardShell>
  )
}
