export default function SettingsAppPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
      <h2 className="text-2xl font-semibold text-primary">Settings</h2>
      <p className="text-sm text-gray-500">Hardware diagnostics & calibration</p>
      <div className="w-full max-w-sm h-48 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 text-sm">
        Settings App
      </div>
    </div>
  )
}
