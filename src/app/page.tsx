import { VoiceButton } from "@/components/voice/voice-button"
import { NowServingWidget } from "@/components/now-serving-widget"

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-12 relative overflow-hidden">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Medibot PX</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
          Healthcare Assistant Robot &mdash; I&apos;m here to help you register,
          check your vitals, and find your doctor.
        </p>
      </div>

      <VoiceButton />

      <div className="absolute top-6 right-6">
        <ModeSwitch />
      </div>

      <NowServingWidget />
    </div>
  )
}

function ModeSwitch() {
  return (
    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5 shadow-sm">
      <span className="text-[11px] font-medium text-gray-400">Idle</span>
      <button
        type="button"
        role="switch"
        aria-checked={false}
        className="relative w-9 h-5 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer transition-colors"
      >
        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform translate-x-0" />
      </button>
      <span className="text-[11px] font-medium text-primary">Auto</span>
    </div>
  )
}