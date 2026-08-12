"use client"

import { usePathname } from "next/navigation"
import { useVoiceEngine } from "./voice-engine"

interface VoiceButtonProps {
  compact?: boolean
}

export function VoiceButton({ compact = false }: VoiceButtonProps) {
  const pathname = usePathname()
  const isHome = pathname === "/"
  const { state, errorMsg, toggle } = useVoiceEngine()

  if (compact) {
    if (isHome) return null
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-1">
        {state !== "idle" && state !== "error" && (
          <div className="text-[10px] font-mono text-gray-500 bg-white/80 dark:bg-gray-900/80 px-2 py-1 rounded-full shadow-sm backdrop-blur">
            {state === "connecting" && "Connecting..."}
            {state === "listening" && "Listening..."}
            {state === "responding" && "Speaking..."}
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          className={`relative w-14 h-14 rounded-full text-white text-sm font-bold
                      flex items-center justify-center
                      shadow-lg transition-all duration-200 active:scale-90 cursor-pointer
                      ${
                        state === "error"
                          ? "bg-gray-400"
                          : state === "listening"
                            ? "bg-red-500 hover:bg-red-600 shadow-red-500/50"
                            : "bg-primary hover:bg-primary-dark shadow-primary/30"
                      }`}
          style={{
            animation: state === "listening" ? "pulse-recording 1.2s ease-in-out infinite" : "none",
          }}
        >
          {state === "responding" && (
            <>
              <span aria-hidden className="absolute inset-0 rounded-full border-2 border-primary/40 wave-ring" />
              <span aria-hidden className="absolute inset-0 rounded-full border-2 border-primary/30 wave-ring" style={{ animationDelay: "0.45s" }} />
              <span aria-hidden className="absolute inset-0 rounded-full border-2 border-primary/20 wave-ring" style={{ animationDelay: "0.9s" }} />
            </>
          )}
          {state === "idle" && <span>AI</span>}
          {state === "connecting" && <span className="animate-spin">&#9696;</span>}
          {state === "listening" && <span className="text-lg">&#9673;</span>}
          {state === "responding" && <span className="text-lg">&#9654;</span>}
          {state === "error" && <span>&#10007;</span>}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={toggle}
        className={`relative w-40 h-40 rounded-full text-white text-lg font-semibold
                    flex items-center justify-center
                    shadow-lg transition-all duration-300 active:scale-95 cursor-pointer
                    ${
                      state === "error"
                        ? "bg-gray-400 cursor-not-allowed"
                        : state === "listening"
                          ? "bg-red-500 hover:bg-red-600 shadow-red-500/50"
                          : "bg-primary hover:bg-primary-dark shadow-primary/30"
                    }`}
        style={{
          animation:
            state === "idle"
              ? "pulse-glow 2.5s ease-in-out infinite"
              : state === "listening"
                ? "pulse-recording 1.2s ease-in-out infinite"
                : "none",
        }}
      >
        {state === "responding" && (
          <>
            <span aria-hidden className="absolute inset-0 rounded-full border-[6px] border-primary/40 wave-ring" />
            <span aria-hidden className="absolute inset-0 rounded-full border-[6px] border-primary/30 wave-ring" style={{ animationDelay: "0.45s" }} />
            <span aria-hidden className="absolute inset-0 rounded-full border-[6px] border-primary/20 wave-ring" style={{ animationDelay: "0.9s" }} />
          </>
        )}
        <span className="text-center leading-tight">
          {state === "idle" && (
            <>
              A.I.
              <br />
              Companion
            </>
          )}
          {state === "connecting" && (
            <span className="animate-spin text-2xl">&#9696;</span>
          )}
          {state === "listening" && (
            <>
              Listening
              <br />
              <span className="text-sm font-normal">tap to stop</span>
            </>
          )}
          {state === "responding" && (
            <>
              Speaking
              <br />
              <span className="text-sm font-normal">...</span>
            </>
          )}
          {state === "error" && (
            <>
              Error
              <br />
              <span className="text-sm font-normal">tap to retry</span>
            </>
          )}
        </span>
      </button>

      {state === "error" && errorMsg ? (
        <p className="text-xs text-red-500 max-w-[260px] text-center leading-relaxed">{errorMsg}</p>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 tracking-wider uppercase">
          {state === "idle" && <span className="animate-pulse">Tap to talk</span>}
          {state === "connecting" && "Connecting..."}
          {state === "listening" && "Listening..."}
          {state === "responding" && "Speaking..."}
        </p>
      )}
    </div>
  )
}
