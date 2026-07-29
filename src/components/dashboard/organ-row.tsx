"use client"

import { useState } from "react"
import type { BodyCondition } from "@/types"
import { OrganCard } from "./organ-card"

interface OrganRowProps {
  conditions: BodyCondition[]
}

export function OrganRow({ conditions }: OrganRowProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>(conditions[0]?.id)

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {conditions.map((condition) => (
        <OrganCard
          key={condition.id}
          name={condition.name}
          icon={condition.icon}
          status={condition.status}
          selected={selectedId === condition.id}
          onClick={() => setSelectedId(condition.id)}
        />
      ))}
    </div>
  )
}
