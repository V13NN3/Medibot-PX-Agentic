"use client"

import Link from "next/link"
import { apps } from "@/lib/apps"
import { useMenu } from "@/components/ui/menu-context"

export function Menu() {
  const { isOpen, setOpen } = useMenu()

  const navItems = apps.filter((a) => a.id !== "settings")
  const settingsItem = apps.find((a) => a.id === "settings")

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold uppercase tracking-wider text-white/80 hover:text-white transition-colors cursor-pointer"
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
              className="text-xs font-semibold uppercase tracking-wider text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              Close
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {navItems.map((app) => (
                <Link
                  key={app.id}
                  href={app.href}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-2 rounded-2xl p-5
                             bg-gray-50 dark:bg-gray-800
                             hover:bg-gray-100 dark:hover:bg-gray-700
                             transition-colors cursor-pointer"
                >
                  <span className="text-4xl">{app.icon}</span>
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

          {settingsItem && (
            <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="max-w-2xl mx-auto">
                <Link
                  href={settingsItem.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3
                             bg-gray-50 dark:bg-gray-800
                             hover:bg-gray-100 dark:hover:bg-gray-700
                             transition-colors cursor-pointer"
                >
                  <span className="text-2xl">{settingsItem.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {settingsItem.name}
                    </p>
                    <p className="text-xs text-gray-500">{settingsItem.description}</p>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
