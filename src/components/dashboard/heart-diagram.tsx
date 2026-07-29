import type { Hotspot } from "@/types"
import { HotspotDiagram } from "./hotspot-diagram"

interface HeartDiagramProps {
  hotspots: Hotspot[]
  selectedId?: string
  onSelect?: (id: string) => void
}

export function HeartDiagram({ hotspots, selectedId, onSelect }: HeartDiagramProps) {
  return (
    <HotspotDiagram hotspots={hotspots} selectedId={selectedId} onSelect={onSelect}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-danger/80" fill="currentColor">
        <path d="M50 85 C20 65 10 45 10 30 C10 15 25 8 38 15 C43 18 47 24 50 30 C53 24 57 18 62 15 C75 8 90 15 90 30 C90 45 80 65 50 85 Z" />
      </svg>
    </HotspotDiagram>
  )
}
