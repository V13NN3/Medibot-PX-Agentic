"use client"

import Link from "next/link"
import { apps } from "@/lib/apps"
import { useMenu } from "@/components/ui/menu-context"

export function Menu() {
  const { isOpen, setOpen } = useMenu()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/80 hover:text-white transition-colors cursor-pointer touch-manipulation"
      >
        Menu
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
          <header className="h-10 bg-status-bar flex items-center justify-between px-4 text-status-text text-xs font-mono shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                Apps
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/80 hover:text-white transition-colors cursor-pointer touch-manipulation"
            >
              Close
            </button>
          </header>

          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
            <div className="w-full max-w-4xl grid grid-cols-5 gap-4">
              {apps.map((app) => (
                <Link
                  key={app.id}
                  href={app.href}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl h-56 p-4
                             bg-gray-50 dark:bg-gray-800
                             hover:bg-gray-100 dark:hover:bg-gray-700
                             transition-colors cursor-pointer"
                >
                  <span className="text-5xl">{app.icon}</span>
                  <span className="text-sm font-medium text-center text-gray-900 dark:text-gray-100">
                    {app.name}
                  </span>
                  <span className="text-[11px] text-gray-500 text-center leading-tight">
                    {app.description}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
