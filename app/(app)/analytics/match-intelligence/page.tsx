// app/(app)/analytics/match-intelligence/page.tsx
"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetcher"
import { AnalyticsKPICard } from "@/components/analytics/kpi-card"
import { AnalyticsSectionCard } from "@/components/analytics/section-card"
import { MessageDistributionChart } from "@/components/analytics/message-distribution-chart"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber, formatPercent, timeAgo } from "@/lib/analytics-utils"
import { cn } from "@/lib/utils"

type MatchPair = {
  user1: string
  user2: string
  matched_at: string
  message_count: number
  call_count: number
  call_seconds: number
  first_message_at: string | null
  last_message_at: string | null
  conversation_started_at: string | null
}

type MatchBucket = { bucket: string; count: number }
type SurvivalPoint = { threshold: number; rate: number; conversations: number }

type MatchIntelligenceData = {
  matches: MatchPair[]
  avg_messages_per_match: number
  call_escalation_rate: number
  median_time_to_first_reply_minutes: number
  match_quality_distribution: MatchBucket[]
  conversation_survival_curve: SurvivalPoint[]
}

type TopPeriod = "7d" | "30d" | "all"
const TOP_PERIODS: Array<{ label: string; value: TopPeriod }> = [
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "All Time", value: "all" },
]

function funnelColor(rate: number): string {
  if (rate >= 0.6) return "#22C55E"
  if (rate >= 0.3) return "#F59E0B"
  return "#EF4444"
}

export default function MatchIntelligencePage() {
  const [topPeriod, setTopPeriod] = useState<TopPeriod>("all")

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "match-intelligence"],
    queryFn: () => apiFetch<MatchIntelligenceData>("/api/zyber/analytics/match-intelligence"),
    staleTime: 5 * 60 * 1000,
  })

  const { data: periodData, isLoading: periodLoading } = useQuery({
    queryKey: ["analytics", "match-intelligence-period", topPeriod],
    queryFn: () =>
      apiFetch<MatchIntelligenceData>(`/api/zyber/analytics/match-intelligence?period=${topPeriod}`),
    enabled: topPeriod !== "all",
    staleTime: 2 * 60 * 1000,
  })

  const allMatches = data?.matches ?? []
  const displayMatches = topPeriod === "all" ? allMatches : (periodData?.matches ?? allMatches)

  const activeConversations7d = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    return allMatches.filter(
      (m) => m.last_message_at && new Date(m.last_message_at).getTime() >= cutoff,
    ).length
  }, [allMatches])

  const callPairsCount = useMemo(
    () => allMatches.filter((m) => m.call_count > 0).length,
    [allMatches],
  )

  const topConversations = useMemo(
    () => [...displayMatches].sort((a, b) => b.message_count - a.message_count).slice(0, 10),
    [displayMatches],
  )

  const recentHighQuality = useMemo(
    () =>
      [...allMatches]
        .filter((m) => m.message_count >= 50 && m.last_message_at)
        .sort((a, b) => new Date(b.last_message_at!).getTime() - new Date(a.last_message_at!).getTime())
        .slice(0, 3),
    [allMatches],
  )

  const staleHighPotential = useMemo(() => {
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
    return [...allMatches]
      .filter(
        (m) =>
          m.message_count >= 20 &&
          m.last_message_at &&
          new Date(m.last_message_at).getTime() < cutoff,
      )
      .sort((a, b) => b.message_count - a.message_count)
      .slice(0, 3)
  }, [allMatches])

  const funnelDropoffs = useMemo(() => {
    const points = data?.conversation_survival_curve ?? []
    return points.map((p, i) => {
      if (i === 0) return 0
      const prev = points[i - 1]
      return ((prev.conversations - p.conversations) / prev.conversations) * 100
    })
  }, [data])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Match Intelligence</h1>
        <p className="text-sm text-muted-foreground">
          Conversation quality, depth, and engagement signals.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <AnalyticsKPICard label="Active Pairs (7D)" value={formatNumber(activeConversations7d)} subValue="Pairs active within 7 days" isLoading={isLoading} />
        <AnalyticsKPICard label="Avg Messages / Match" value={data ? data.avg_messages_per_match.toFixed(1) : "—"} subValue="Per matched pair" isLoading={isLoading} />
        <AnalyticsKPICard label="Median First Reply" value={data ? `${data.median_time_to_first_reply_minutes} min` : "—"} subValue="Time to first reply" isLoading={isLoading} />
        <AnalyticsKPICard
          label="Call Escalation Rate"
          value={data ? formatPercent(data.call_escalation_rate) : "—"}
          subValue={`${formatNumber(callPairsCount)} of ${formatNumber(allMatches.length)} pairs`}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnalyticsSectionCard title="Match Quality Distribution" subtitle="Conversation depth by message volume">
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <MessageDistributionChart data={data?.match_quality_distribution ?? []} />
          )}
        </AnalyticsSectionCard>

        <AnalyticsSectionCard title="Match Health Funnel" subtitle="Share of conversations reaching each depth">
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <div className="space-y-3">
              {(data?.conversation_survival_curve ?? []).map((point, i) => (
                <div key={point.threshold} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{point.threshold}+ messages</span>
                    <div className="text-right">
                      <div>{formatPercent(point.rate)} · {formatNumber(point.conversations)}</div>
                      {i > 0 && (
                        <div className="text-[11px] text-destructive">
                          ↓ {funnelDropoffs[i].toFixed(1)}% drop from prev
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(point.rate * 100, 100)}%`,
                        backgroundColor: funnelColor(point.rate),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnalyticsSectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnalyticsSectionCard
          title="Top Conversations"
          subtitle="Highest message volume"
          action={
            <div className="flex rounded-md border bg-muted/20 p-0.5">
              {TOP_PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setTopPeriod(p.value)}
                  className={cn(
                    "rounded px-2.5 py-1 text-[11px] transition-colors",
                    topPeriod === p.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          }
        >
          {isLoading || (topPeriod !== "all" && periodLoading) ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 pr-3 text-left font-medium">Pair</th>
                    <th className="py-2 pr-3 text-right font-medium">Messages</th>
                    <th className="py-2 pr-3 text-right font-medium">Calls</th>
                    <th className="py-2 text-right font-medium">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {topConversations.map((m) => (
                    <tr key={`${m.user1}-${m.user2}`} className="border-b last:border-0">
                      <td className="py-2 pr-3">{m.user1} ↔ {m.user2}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(m.message_count)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(m.call_count)}</td>
                      <td className="py-2 text-right tabular-nums">{m.last_message_at ? timeAgo(m.last_message_at) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AnalyticsSectionCard>

        <AnalyticsSectionCard title="Match Highlights" subtitle="Recent wins and matches to re-engage">
          <div className="space-y-4">
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-green-400" />
                <h4 className="text-sm font-medium text-green-400">High Quality Matches</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Actively engaging — consider nudging toward calls.
              </p>
              <div className="space-y-2">
                {recentHighQuality.map((m) => (
                  <div key={`${m.user1}-${m.user2}-q`} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-white/5 transition-colors">
                    <div>
                      <div className="text-sm font-medium">{m.user1} ↔ {m.user2}</div>
                      <div className="text-xs text-muted-foreground">Active match</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-400">{formatNumber(m.message_count)}</div>
                      <div className="text-xs text-muted-foreground">messages</div>
                    </div>
                  </div>
                ))}
                {recentHighQuality.length === 0 && <p className="text-xs text-muted-foreground">No high quality matches yet.</p>}
              </div>
            </div>

            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-orange-400" />
                <h4 className="text-sm font-medium text-orange-400">Needs Re-engagement</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Strong conversations gone cold — send reminders or starters.
              </p>
              <div className="space-y-2">
                {staleHighPotential.map((m) => (
                  <div key={`${m.user1}-${m.user2}-s`} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-white/5 transition-colors">
                    <div>
                      <div className="text-sm font-medium">{m.user1} ↔ {m.user2}</div>
                      <div className="text-xs text-muted-foreground">Last active {m.last_message_at ? timeAgo(m.last_message_at) : "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-orange-400">{formatNumber(m.message_count)}</div>
                      <div className="text-xs text-muted-foreground">messages</div>
                    </div>
                  </div>
                ))}
                {staleHighPotential.length === 0 && <p className="text-xs text-muted-foreground">No stale high-potential matches.</p>}
              </div>
            </div>
          </div>
        </AnalyticsSectionCard>
      </div>
    </div>
  )
}
