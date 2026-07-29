import type { Doctor, ScheduleItem } from "@/types"

export const doctors: Doctor[] = [
  { id: "doc-hanzer", name: "Dr. Hanzer Jon", specialty: "Cardiology", avatarInitials: "HJ" },
  { id: "doc-steve", name: "Dr. Steve Alex", specialty: "Internal Medicine", avatarInitials: "SA" },
  { id: "doc-johan", name: "Dr. Johan Fraz", specialty: "Nephrology", avatarInitials: "JF" },
  { id: "doc-sandeep", name: "Dr. Sandeep Girl", specialty: "Pulmonology", avatarInitials: "SG" },
]

export const scheduleItems: ScheduleItem[] = [
  { id: "sched-1", doctor: doctors[0], date: "Fri, 24 Mar", time: "9:30 AM" },
  { id: "sched-2", doctor: doctors[1], date: "Mon, 27 Mar", time: "1:00 PM" },
  { id: "sched-3", doctor: doctors[2], date: "Wed, 29 Mar", time: "11:15 AM" },
]

export const nextCheckup: ScheduleItem = scheduleItems[0]
