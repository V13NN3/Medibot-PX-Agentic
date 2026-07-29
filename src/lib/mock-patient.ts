import type { BodyCondition, Hotspot, MedicalHistoryEntry, Patient } from "@/types"

export const patient: Patient = {
  id: "MB-004821",
  name: "Debra Robertson",
  age: 38,
  sex: "Female",
  avatarInitials: "DR",
}

export const heartRateTrend = [78, 82, 91, 88, 96, 105, 112, 108, 118, 120]
export const brainActivityTrend = [8, 10, 9, 12, 14, 11, 15, 13, 16, 16]

export const vitals = {
  heartRate: { label: "Atrial Fibrillation", value: 120, unit: "BPM", trend: heartRateTrend, status: "warning" as const },
  brainActivity: { label: "Brain Activity", value: 16, unit: "", trend: brainActivityTrend, status: "normal" as const },
}

export const medicalHistory: MedicalHistoryEntry[] = [
  { id: "mh-1", date: "2026-07-07", condition: "Bradycardia", symptoms: ["Fatigue", "Dizziness", "Confusion"] },
  { id: "mh-2", date: "2025-03-02", condition: "Liver Disease", symptoms: ["Skin and eyes that appear yellowish", "Itchy skin"] },
  { id: "mh-3", date: "2024-06-02", condition: "Kidney Stones", symptoms: ["Fatigue", "Shortness of breath", "Chest pain"] },
  { id: "mh-4", date: "2024-05-07", condition: "Heart Failure", symptoms: ["Fatigue", "Irregular heartbeat", "Swelling in your legs"] },
  { id: "mh-5", date: "2018-05-08", condition: "Pulmonary Stenosis", symptoms: ["Fatigue", "Chest pain", "Loss of consciousness"] },
  { id: "mh-6", date: "2017-07-01", condition: "Coronary Artery Disease", symptoms: ["Chest pain", "Shortness of breath"] },
  { id: "mh-7", date: "2016-07-01", condition: "Dilated Cardiomyopathy", symptoms: ["Chest pain", "Shortness of breath"] },
  { id: "mh-8", date: "2015-07-01", condition: "Heart Failure", symptoms: ["Chest pain", "Shortness of breath"] },
]

export const bodyHotspots: Hotspot[] = [
  { id: "hs-heart", label: "Heart Failure", x: 50, y: 27, status: "danger" },
  { id: "hs-liver", label: "Liver Disease", x: 42, y: 40, status: "warning" },
  { id: "hs-kidney", label: "Kidney Stones", x: 58, y: 44, status: "warning" },
]

export const heartHotspots: Hotspot[] = [
  { id: "hh-1", label: "Coronary Artery Disease", x: 38, y: 32, status: "danger" },
  { id: "hh-2", label: "Dilated Cardiomyopathy", x: 62, y: 46, status: "warning" },
  { id: "hh-3", label: "Pulmonary Stenosis", x: 52, y: 20, status: "normal" },
]

export const bodyConditions: BodyCondition[] = [
  { id: "bc-heart", name: "Heart", icon: "❤️", status: "danger" },
  { id: "bc-liver", name: "Liver", icon: "🫁", status: "warning" },
  { id: "bc-kidneys", name: "Kidneys", icon: "🫘", status: "warning" },
  { id: "bc-lungs", name: "Lungs", icon: "🫁", status: "normal" },
]
