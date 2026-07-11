export type OperatingMode = "idle" | "autonomous" | "manual" | "interactive"

export interface AppDefinition {
  id: string
  name: string
  description: string
  icon: string
  href: string
}
