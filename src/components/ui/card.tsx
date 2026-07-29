import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
}

interface CardProps {
  children: ReactNode
  className?: string
  padding?: keyof typeof paddingMap
}

export function Card({ children, className, padding = "md" }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card dark:bg-card-dark border border-gray-100 dark:border-gray-800 shadow-sm",
        paddingMap[padding],
        className,
      )}
    >
      {children}
    </div>
  )
}
