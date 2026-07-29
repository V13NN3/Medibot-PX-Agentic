import type { AnalysisRow, RangeStatus } from "@/types"
import { Card } from "@/components/ui/card"
import { getRangeStatus } from "@/lib/utils"

const statusText: Record<RangeStatus, string> = {
  normal: "text-foreground",
  warning: "text-warning",
  danger: "text-danger",
}

interface AnalysisTableProps {
  rows: AnalysisRow[]
  title?: string
}

export function AnalysisTable({ rows, title = "Analysis codes" }: AnalysisTableProps) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium text-right">Value</th>
              <th className="px-4 py-2 font-medium text-right">Reference range</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const status = getRangeStatus(row.value, row.referenceLow, row.referenceHigh)
              return (
                <tr key={row.id} className="border-t border-gray-50 dark:border-gray-800/60">
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{row.name}</td>
                  <td className={`px-4 py-2 text-right font-medium ${statusText[status]}`}>
                    {row.value} {row.unit}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-400 whitespace-nowrap">
                    {row.referenceLow}&ndash;{row.referenceHigh} {row.unit}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
