export type OperatingMode = "idle" | "autonomous" | "manual" | "interactive"

export interface AppDefinition {
  id: string
  name: string
  description: string
  icon: string
  href: string
}

export type RangeStatus = "normal" | "warning" | "danger"

export interface Patient {
  id: string
  name: string
  age: number
  sex: "Male" | "Female"
  avatarInitials: string
}

export interface AnalysisRow {
  id: string
  name: string
  value: number
  unit: string
  referenceLow: number
  referenceHigh: number
}

export interface MedicalHistoryEntry {
  id: string
  date: string
  condition: string
  symptoms: string[]
  notes?: string
}

export interface Hotspot {
  id: string
  label: string
  x: number
  y: number
  status?: RangeStatus
}

export interface BodyCondition {
  id: string
  name: string
  icon: string
  status: RangeStatus
}

export interface TaskItem {
  id: string
  label: string
  dueIn: string
  done?: boolean
}

export interface ActivityItem {
  id: string
  senderName: string
  senderInitials: string
  snippet: string
  timestamp: string
}

export interface Doctor {
  id: string
  name: string
  specialty: string
  avatarInitials: string
}

export interface ScheduleItem {
  id: string
  doctor: Doctor
  date: string
  time: string
}
