"use client"

export function CountdownOverlay({ number, show }: { number: number; show: boolean }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div key={number} className="countdown-num text-[180px] font-black text-white select-none">
        {number}
      </div>
    </div>
  )
}
