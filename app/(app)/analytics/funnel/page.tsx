// app/(app)/analytics/funnel/page.tsx
"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Send } from "lucide-react"
import { apiFetch } from "@/lib/fetcher"
import { AnalyticsKPICard } from "@/components/analytics/kpi-card"
import { AnalyticsSectionCard } from "@/components/analytics/section-card"
import { FunnelChart } from "@/components/analytics/funnel-chart"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber, formatPercent } from "@/lib/analytics-utils"
import { cn } from "@/lib/utils"

type FunnelPeriod = "7d" | "30d" | "all"

type FunnelData = {
  period: FunnelPeriod
  total_users: number
  onboarded_users: number
  conversation_users: number
  meaningful_match_users: number
  first_message_users: number
  first_message_sent_rate: number
}

const PERIODS: Array<{ label: string; value: FunnelPeriod }> = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "All Time", value: "all" },
]

export default function FunnelPage() {
  const [period, setPeriod] = useState<FunnelPeriod>("30d")

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "funnel", period],
    queryFn: () => apiFetch<FunnelData>(`/api/zyber/analytics/funnel?period=${period}`),
    staleTime: 2 * 60 * 1000,
  })

  const stageRows = useMemo(() => {
    if (!data) return []
    return [
      { label: "Total Users", value: data.total_users },
      { label: "Onboarded", value: data.onboarded_users },
      { label: "Started Conv.", value: data.conversation_users },
      { label: "Meaningful Match", value: data.meaningful_match_users },
    ]
  }, [data])

  const stages = useMemo(
    () =>
      stageRows.map((s, i) => {
        const prev = i === 0 ? s.value : stageRows[i - 1].value
        return { ...s, rate: i === 0 ? 1 : prev > 0 ? s.value / prev : 0 }
      }),
    [stageRows],
  )

  const dropoffs = useMemo(
    () =>
      stageRows.slice(1).map((s, i) => {
        const prev = stageRows[i]
        const dropCount = Math.max(prev.value - s.value, 0)
        return {
          from: prev.label,
          to: s.label,
          conversion: prev.value > 0 ? s.value / prev.value : 0,
          dropoff: prev.value > 0 ? dropCount / prev.value : 0,
          dropCount,
        }
      }),
    [stageRows],
  )

  const largestDropoff = useMemo(
    () => [...dropoffs].sort((a, b) => b.dropoff - a.dropoff)[0],
    [dropoffs],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Funnel</h1>
        <p className="text-sm text-muted-foreground">
          User progression through onboarding and engagement stages.
        </p>
      </div>

      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs border transition-colors",
              period === p.value
                ? "border-primary/40 bg-muted text-foreground"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <AnalyticsKPICard label="Sent First Message" value={data ? formatNumber(data.first_message_users) : "—"} subValue="Started a conversation" icon={<Send className="w-3.5 h-3.5" />} isLoading={isLoading} />
        <AnalyticsKPICard label="First Msg Rate" value={data ? formatPercent(data.first_message_sent_rate) : "—"} subValue="Of onboarded users" icon={<Send className="w-3.5 h-3.5" />} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <AnalyticsSectionCard title="User Funnel" subtitle="Progression through key stages" className="lg:col-span-3">
          {isLoading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <FunnelChart stages={stages} />
          )}
        </AnalyticsSectionCard>

        <AnalyticsSectionCard title="Largest Drop-off" subtitle="Biggest user loss point" className="lg:col-span-2">
          {isLoading || !largestDropoff ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <div className="space-y-3 text-sm">
              {[
                { label: "Stage From", value: largestDropoff.from },
                { label: "Stage To", value: largestDropoff.to },
                { label: "Conversion Rate", value: formatPercent(largestDropoff.conversion) },
                { label: "Drop-off Rate", value: formatPercent(largestDropoff.dropoff) },
                { label: "Users Lost", value: formatNumber(largestDropoff.dropCount) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}
        </AnalyticsSectionCard>
      </div>

      <AnalyticsSectionCard title="Stage-by-Stage Performance" subtitle="Conversion and drop-off across each stage">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 pr-4 text-left font-medium">Funnel Transition</th>
                <th className="py-2 pr-4 text-right font-medium">Conversion %</th>
                <th className="py-2 pr-4 text-right font-medium">Drop-off %</th>
                <th className="py-2 text-right font-medium">Users Lost</th>
              </tr>
            </thead>
            <tbody>
              {dropoffs.map((row) => (
                <tr key={`${row.from}-${row.to}`} className="border-b last:border-0">
                  <td className="py-2 pr-4">{row.from} → {row.to}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatPercent(row.conversion)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-destructive">{formatPercent(row.dropoff)}</td>
                  <td className="py-2 text-right tabular-nums">{formatNumber(row.dropCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnalyticsSectionCard>
    </div>
  )
}
