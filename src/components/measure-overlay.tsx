"use client"

export function MeasureOverlay({
  icon,
  label,
  note,
  calculating,
}: {
  icon: string
  label: string
  note: string
  calculating: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/70 px-6 text-center select-none">
      <span className="text-7xl">{icon}</span>
      <p className="text-3xl font-black text-white">{label}</p>
      <p className="text-2xl font-semibold text-white/90 max-w-lg leading-snug">{note}</p>
      {calculating && (
        <div className="flex items-center gap-3 text-white">
          <span className="inline-block w-6 h-6 rounded-full border-4 border-white border-t-transparent animate-spin" />
          <span className="text-2xl font-bold">Calculating...</span>
        </div>
      )}
    </div>
  )
}
