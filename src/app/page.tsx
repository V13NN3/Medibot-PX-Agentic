export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-12">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Medibot PX</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
          Healthcare Assistant Robot &mdash; I&apos;m here to help you register,
          check your vitals, and find your doctor.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          className="w-40 h-40 rounded-full bg-primary text-white text-lg font-semibold
                     flex items-center justify-center
                     shadow-lg shadow-primary/30
                     transition-all duration-300
                     hover:bg-primary-dark
                     active:scale-95
                     cursor-pointer"
          style={{
            animation: "pulse-glow 2.5s ease-in-out infinite",
          }}
        >
          <span className="text-center leading-tight">
            A.I.
            <br />
            Companion
          </span>
        </button>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 animate-pulse tracking-wider uppercase">
          Tap to talk
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        <ModeOption label="Idle" active />
        <ModeOption label="Auto" />
        <ModeOption label="Manual" />
      </div>
    </div>
  )
}

function ModeOption({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors ${
        active
          ? "border-primary text-primary bg-primary/5"
          : "border-gray-200 dark:border-gray-700 text-gray-400"
      }`}
    >
      {label}
    </div>
  )
}
