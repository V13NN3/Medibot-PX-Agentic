import { Card } from "@/components/ui/card"

interface PatientHeaderProps {
  name: string
  patientId: string
  age: number
  sex?: string
  avatarInitials?: string
}

export function PatientHeader({ name, patientId, age, sex, avatarInitials }: PatientHeaderProps) {
  return (
    <Card className="flex items-center gap-4" padding="md">
      <div className="w-14 h-14 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold">
        {avatarInitials}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">
          ID {patientId} &middot; Age {age}
          {sex ? ` · ${sex}` : ""}
        </p>
        <h2 className="text-xl font-semibold text-foreground truncate">{name}</h2>
      </div>
    </Card>
  )
}
