interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
  fill?: boolean
}

export function Sparkline({
  data,
  width = 64,
  height = 24,
  color = "var(--color-primary)",
  strokeWidth = 1.5,
  fill = false,
}: SparklineProps) {
  if (data.length === 0) return <svg width={width} height={height} />

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min

  const points = data.map((value, i) => {
    const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width
    const y = range === 0 ? height / 2 : height - ((value - min) / range) * height
    return [x, y] as const
  })

  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ")
  const areaPath = fill
    ? `${path} L${points[points.length - 1][0].toFixed(2)},${height} L${points[0][0].toFixed(2)},${height} Z`
    : undefined

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {areaPath && <path d={areaPath} fill={color} fillOpacity={0.12} stroke="none" />}
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
