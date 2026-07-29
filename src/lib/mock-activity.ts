import type { ActivityItem, TaskItem } from "@/types"

export const tasks: TaskItem[] = [
  { id: "task-1", label: "Do preliminary tests", dueIn: "In 1 day" },
  { id: "task-2", label: "Approve the MRI negative", dueIn: "In 3 days" },
  { id: "task-3", label: "Prescribe the medication", dueIn: "In 10 days" },
  { id: "task-4", label: "Do the new tests", dueIn: "In 15 days" },
  { id: "task-5", label: "Call the doctor", dueIn: "Today" },
]

export const activity: ActivityItem[] = [
  { id: "act-1", senderName: "Aubrey Moccy", senderInitials: "AM", snippet: "sent a tracked email to Sandeep Girl (sandeep@gmail.com)", timestamp: "10 days ago" },
  { id: "act-2", senderName: "Re: Cisco-UCSF Healthcare Platform Discussion", senderInitials: "CU", snippet: "Hi, I'm sending you my analysis results, can you tell me what these numbers mean? Thanks!", timestamp: "10 days ago" },
  { id: "act-3", senderName: "Britney Cooper", senderInitials: "BC", snippet: "sent you a new audio message (cooper.br@gmail.com)", timestamp: "5 hrs ago" },
  { id: "act-4", senderName: "Aubrey Moccy", senderInitials: "AM", snippet: "sent you the results of your tests (sandeep@gmail.com)", timestamp: "2 hrs ago" },
]
