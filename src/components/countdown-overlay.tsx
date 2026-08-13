"use client"

export function CountdownOverlay({
  number,
  show,
  caption,
}: {
  number: number
  show: boolean
  caption?: string
}) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/70">
      <div key={number} className="countdown-num text-[180px] font-black text-white select-none">
        {number}
      </div>
      {caption && <p className="text-2xl font-semibold text-white/90 select-none">{caption}</p>}
    </div>
  )
}
