import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { VitalBadge } from "@/components/dashboard/vital-badge"
import { AnalysisTable } from "@/components/dashboard/analysis-table"
import { analysisRows } from "@/lib/mock-labs"
import { getRangeStatus } from "@/lib/utils"

export default function LabsAppPage() {
  const outOfRange = analysisRows.filter(
    (row) => getRangeStatus(row.value, row.referenceLow, row.referenceHigh) === "danger",
  ).length

  return (
    <DashboardShell>
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Lab Results</h2>
        <p className="text-sm text-gray-500">View X-rays, blood tests, and other lab results</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <VitalBadge label="Panel" value="Basic Metabolic" status="normal" />
        <VitalBadge label="Last drawn" value="2026-07-07" status="normal" />
        <VitalBadge label="Out of range" value={outOfRange} status={outOfRange > 0 ? "danger" : "normal"} />
      </div>

      <AnalysisTable rows={analysisRows} />
    </DashboardShell>
  )
}
