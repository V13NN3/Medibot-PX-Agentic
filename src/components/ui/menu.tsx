"use client"

import Link from "next/link"
import { useState } from "react"
import { apps } from "@/lib/apps"
import { cn } from "@/lib/utils"

export function Menu() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold uppercase tracking-wider text-white/80 hover:text-white transition-colors cursor-pointer"
      >
        Menu
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="fixed right-2 top-12 z-50 w-64 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Apps</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {apps.filter((a) => a.id !== "settings").map((app, i) => (
                <Link
                  key={app.id}
                  href={app.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                    i > 0 && "border-t border-gray-100 dark:border-gray-800",
                  )}
                >
                  <span className="text-lg">{app.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{app.name}</p>
                    <p className="text-xs text-gray-500">{app.description}</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="border-t-2 border-gray-200 dark:border-gray-700">
              {apps.filter((a) => a.id === "settings").map((app) => (
                <Link
                  key={app.id}
                  href={app.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="text-lg">{app.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{app.name}</p>
                    <p className="text-xs text-gray-500">{app.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
