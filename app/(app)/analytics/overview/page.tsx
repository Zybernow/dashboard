// app/(app)/analytics/overview/page.tsx
"use client"

import { useQuery } from "@tanstack/react-query"
import { Users, Zap, Activity, Target, MessageCircle, MessagesSquare, Clock } from "lucide-react"
import { apiFetch } from "@/lib/fetcher"
import { AnalyticsKPICard } from "@/components/analytics/kpi-card"
import { AnalyticsSectionCard } from "@/components/analytics/section-card"
import { GrowthTrendChart } from "@/components/analytics/growth-trend-chart"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber, formatPercent, formatDuration } from "@/lib/analytics-utils"

type TimeSeriesPoint = { date: string; value: number }

type OverviewData = {
  total_users: number
  live_users_15m: number
  participation_rate: number
  meaningful_matches: number
  messages_sent: number
  match_conversion_rate: number
  avg_messages_per_match: number
  avg_call_duration_seconds: number
  user_growth: TimeSeriesPoint[]
  new_users: TimeSeriesPoint[]
  meaningful_match_trend: TimeSeriesPoint[]
}

export default function AnalyticsOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "platform-metrics"],
    queryFn: () => apiFetch<OverviewData>("/api/zyber/analytics/platform-metrics"),
    staleTime: 2 * 60 * 1000,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">
          Key platform metrics and growth trends.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <AnalyticsKPICard
          label="Total Users"
          value={data ? formatNumber(data.total_users) : "—"}
          subValue="All registered users"
          icon={<Users className="w-3.5 h-3.5" />}
          isLoading={isLoading}
        />
        <AnalyticsKPICard
          label="Live Users"
          value={data ? formatNumber(data.live_users_15m) : "—"}
          subValue="Active in last 15 minutes"
          icon={<Zap className="w-3.5 h-3.5" />}
          accent
          live
          isLoading={isLoading}
        />
        <AnalyticsKPICard
          label="Participation Rate"
          value={data ? formatPercent(data.participation_rate) : "—"}
          subValue="Users who sent ≥1 message"
          icon={<Activity className="w-3.5 h-3.5" />}
          isLoading={isLoading}
        />
        <AnalyticsKPICard
          label="Meaningful Matches"
          value={data ? formatNumber(data.meaningful_matches) : "—"}
          subValue="Pairs with 10+ messages"
          icon={<Target className="w-3.5 h-3.5" />}
          isLoading={isLoading}
        />
        <AnalyticsKPICard
          label="Messages Sent"
          value={data ? formatNumber(data.messages_sent) : "—"}
          subValue="Total platform messages"
          icon={<MessageCircle className="w-3.5 h-3.5" />}
          isLoading={isLoading}
        />
        <AnalyticsKPICard
          label="Match Conversion"
          value={data ? formatPercent(data.match_conversion_rate) : "—"}
          subValue="Conversations reaching 10+ msgs"
          icon={<MessagesSquare className="w-3.5 h-3.5" />}
          isLoading={isLoading}
        />
        <AnalyticsKPICard
          label="Avg Messages / Match"
          value={data ? data.avg_messages_per_match.toFixed(1) : "—"}
          subValue="Per conversation pair"
          icon={<Activity className="w-3.5 h-3.5" />}
          isLoading={isLoading}
        />
        <AnalyticsKPICard
          label="Avg Call Duration"
          value={data ? formatDuration(data.avg_call_duration_seconds) : "—"}
          subValue="Completed calls only"
          icon={<Clock className="w-3.5 h-3.5" />}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnalyticsSectionCard
          title="User Growth"
          subtitle="Cumulative total users — last 30 days"
        >
          {isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <GrowthTrendChart data={data?.user_growth ?? []} valueLabel="Total Users" />
          )}
        </AnalyticsSectionCard>

        <AnalyticsSectionCard
          title="New Users"
          subtitle="Daily signup volume — last 30 days"
        >
          {isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <GrowthTrendChart data={data?.new_users ?? []} valueLabel="New Users" />
          )}
        </AnalyticsSectionCard>

        <AnalyticsSectionCard
          title="Meaningful Match Trend"
          subtitle="Pairs reaching 10+ messages per week — last 12 weeks"
        >
          {isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <GrowthTrendChart
              data={data?.meaningful_match_trend ?? []}
              valueLabel="Meaningful Matches"
            />
          )}
        </AnalyticsSectionCard>
      </div>
    </div>
  )
}
