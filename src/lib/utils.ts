import type { RangeStatus } from "@/types"

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ")
}

export function getRangeStatus(value: number, low: number, high: number): RangeStatus {
  if (value < low || value > high) return "danger"
  const span = high - low
  const margin = span * 0.1
  if (value < low + margin || value > high - margin) return "warning"
  return "normal"
}
