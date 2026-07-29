import type { Hotspot } from "@/types"
import { HotspotDiagram } from "./hotspot-diagram"

interface BodyDiagramProps {
  hotspots: Hotspot[]
  selectedId?: string
  onSelect?: (id: string) => void
}

export function BodyDiagram({ hotspots, selectedId, onSelect }: BodyDiagramProps) {
  return (
    <HotspotDiagram hotspots={hotspots} selectedId={selectedId} onSelect={onSelect}>
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full text-gray-200 dark:text-gray-700"
        fill="currentColor"
      >
        <circle cx="50" cy="10" r="7" />
        <path d="M38 20 h24 a6 6 0 0 1 6 6 v20 a6 6 0 0 1 -6 6 h-24 a6 6 0 0 1 -6 -6 v-20 a6 6 0 0 1 6 -6 Z" />
        <rect x="24" y="22" width="8" height="30" rx="4" />
        <rect x="68" y="22" width="8" height="30" rx="4" />
        <rect x="40" y="52" width="9" height="34" rx="4" />
        <rect x="51" y="52" width="9" height="34" rx="4" />
      </svg>
    </HotspotDiagram>
  )
}
