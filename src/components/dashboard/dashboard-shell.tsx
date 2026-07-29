import type { ReactNode } from "react"

interface DashboardShellProps {
  children: ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
      {children}
    </div>
  )
}
