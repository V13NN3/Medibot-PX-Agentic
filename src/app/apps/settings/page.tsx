import { Card } from "@/components/ui/card"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"

export default function SettingsAppPage() {
  return (
    <DashboardShell>
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-gray-500">Hardware diagnostics &amp; calibration</p>
      </div>

      <Card className="max-w-sm flex items-center justify-center h-48 text-gray-400 text-sm">
        Settings App
      </Card>
    </DashboardShell>
  )
}
