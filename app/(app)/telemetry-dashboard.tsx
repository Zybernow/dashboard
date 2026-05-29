"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { apiFetch } from "@/lib/fetcher"
import type {
  DailyCallStatsResponse,
  EngagementMetrics,
  FirebaseMetrics,
  MatchLeaderboard,
  MatchPairRow,
  MatchSort,
  ReferralAnalytics,
  Telemetry,
  WindowedCount,
} from "@/lib/zyber-types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

export function TelemetryDashboard() {
  const [days, setDays] = useState("30")

  const telemetry = useQuery({
    queryKey: ["zyber", "telemetry"],
    queryFn: () => apiFetch<Telemetry>("/api/zyber/telemetry"),
    refetchInterval: 30_000,
  })

  const callStats = useQuery({
    queryKey: ["zyber", "call-stats", days],
    queryFn: () =>
      apiFetch<DailyCallStatsResponse>(
        `/api/zyber/telemetry/call-stats?days=${days}`,
      ),
  })

  const referrals = useQuery({
    queryKey: ["zyber", "referrals"],
    queryFn: () =>
      apiFetch<ReferralAnalytics>("/api/zyber/analytics/referral-sources"),
  })

  const engagement = useQuery({
    queryKey: ["zyber", "engagement"],
    queryFn: () =>
      apiFetch<EngagementMetrics>("/api/zyber/analytics/engagement"),
    refetchInterval: 30_000,
  })

  const firebase = useQuery({
    queryKey: ["zyber", "firebase"],
    queryFn: () =>
      apiFetch<FirebaseMetrics>("/api/zyber/analytics/firebase"),
    // GA4 data is delayed up to ~24h and rate-limited; no point polling.
    staleTime: 60 * 60 * 1000,
  })

  const [matchSort, setMatchSort] = useState<MatchSort>("messages")

  const matches = useQuery({
    queryKey: ["zyber", "matches", matchSort],
    queryFn: () =>
      apiFetch<MatchLeaderboard>(
        `/api/zyber/analytics/matches?sort=${matchSort}`,
      ),
    placeholderData: (prev) => prev,
  })

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Users</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Total"
            value={telemetry.data?.users.total}
            isLoading={telemetry.isLoading}
          />
          <StatCard
            label="Active"
            value={telemetry.data?.users.active}
            isLoading={telemetry.isLoading}
          />
          <StatCard
            label="Disabled"
            value={telemetry.data?.users.disabled}
            isLoading={telemetry.isLoading}
          />
          <StatCard
            label="Live now"
            value={telemetry.data?.users.live}
            highlight
            isLoading={telemetry.isLoading}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          New users
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Last 24h"
            value={telemetry.data?.users.new_24h}
            isLoading={telemetry.isLoading}
          />
          <StatCard
            label="Last 7d"
            value={telemetry.data?.users.new_7d}
            isLoading={telemetry.isLoading}
          />
          <StatCard
            label="Last 30d"
            value={telemetry.data?.users.new_30d}
            isLoading={telemetry.isLoading}
          />
        </div>
      </section>

      <WindowedSection
        title="Onboarded users"
        data={engagement.data?.onboarded}
        isLoading={engagement.isLoading}
      />
      <WindowedSection
        title="Verified users"
        description="Work email verified"
        data={engagement.data?.verified}
        isLoading={engagement.isLoading}
      />
      <MatchesLeaderboard
        data={matches.data?.pairs}
        isLoading={matches.isLoading}
        sort={matchSort}
        onSortChange={setMatchSort}
      />
      <FirebaseEventsSection
        data={firebase.data?.events}
        isLoading={firebase.isLoading}
      />

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Communities & calls
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Communities"
            value={telemetry.data?.community.total}
            isLoading={telemetry.isLoading}
          />
          <StatCard
            label="Total members"
            value={telemetry.data?.community.total_members}
            isLoading={telemetry.isLoading}
          />
          <StatCard
            label="Active calls"
            value={telemetry.data?.calls.active}
            highlight
            isLoading={telemetry.isLoading}
          />
          <StatCard
            label="Total call minutes"
            value={
              telemetry.data
                ? Math.round(telemetry.data.calls.total_seconds / 60)
                : undefined
            }
            isLoading={telemetry.isLoading}
          />
        </div>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Daily call seconds</CardTitle>
            <CardDescription>Aggregated call duration per day.</CardDescription>
          </div>
          <Select value={days} onValueChange={(v) => v && setDays(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {callStats.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : callStats.data && callStats.data.stats.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={callStats.data.stats}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total_seconds"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Referral sources</CardTitle>
          <CardDescription>
            How users discovered Zyber, by self-reported source.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : referrals.data && Object.keys(referrals.data.sources).length > 0 ? (
            <ReferralBars sources={referrals.data.sources} />
          ) : (
            <p className="text-sm text-muted-foreground">No referral data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
  isLoading,
}: {
  label: string
  value: number | undefined
  highlight?: boolean
  isLoading?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={`text-3xl ${highlight ? "text-primary" : ""}`}
        >
          {isLoading ? <Skeleton className="h-8 w-20" /> : value ?? "—"}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

function WindowedSection({
  title,
  description,
  data,
  isLoading,
  format,
}: {
  title: string
  description?: string
  data: WindowedCount | undefined
  isLoading: boolean
  format?: (v: number) => number
}) {
  const apply = (v: number | undefined) =>
    v === undefined ? undefined : format ? format(v) : v
  return (
    <section>
      <h2 className="mb-1 text-sm font-medium text-muted-foreground">
        {title}
      </h2>
      {description ? (
        <p className="mb-3 text-xs text-muted-foreground/70">{description}</p>
      ) : (
        <div className="mb-3" />
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="All-time"
          value={apply(data?.total)}
          isLoading={isLoading}
        />
        <StatCard
          label="Last 24h"
          value={apply(data?.last_24h)}
          isLoading={isLoading}
        />
        <StatCard
          label="Last 7d"
          value={apply(data?.last_7d)}
          isLoading={isLoading}
        />
        <StatCard
          label="Last 30d"
          value={apply(data?.last_30d)}
          isLoading={isLoading}
        />
      </div>
    </section>
  )
}

function FirebaseEventsSection({
  data,
  isLoading,
}: {
  data: Record<string, WindowedCount> | undefined
  isLoading: boolean
}) {
  const entries = data ? Object.entries(data) : []
  return (
    <section>
      <h2 className="mb-1 text-sm font-medium text-muted-foreground">
        Firebase event counts
      </h2>
      <p className="mb-3 text-xs text-muted-foreground/70">
        Total fires per event, across all users.
      </p>
      <Card>
        <CardContent className="overflow-x-auto px-0">
          {isLoading ? (
            <div className="space-y-2 px-6 py-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : entries.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              No event data.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-6 py-2 text-left font-medium">Event</th>
                  <th className="px-3 py-2 text-right font-medium">365d</th>
                  <th className="px-3 py-2 text-right font-medium">24h</th>
                  <th className="px-3 py-2 text-right font-medium">7d</th>
                  <th className="px-6 py-2 text-right font-medium">30d</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([name, w]) => (
                  <tr key={name} className="border-b last:border-0">
                    <td className="px-6 py-2 font-medium">{name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {w.total.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {w.last_24h.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {w.last_7d.toLocaleString()}
                    </td>
                    <td className="px-6 py-2 text-right tabular-nums">
                      {w.last_30d.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "—"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatSpan(from: string | null, to: string | null): string {
  if (!from || !to) return "—"
  const ms = new Date(to).getTime() - new Date(from).getTime()
  if (!Number.isFinite(ms) || ms <= 0) return "—"
  const days = Math.floor(ms / 86_400_000)
  if (days >= 1) return `${days}d`
  const hours = Math.floor(ms / 3_600_000)
  if (hours >= 1) return `${hours}h`
  return `${Math.max(1, Math.floor(ms / 60_000))}m`
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const MATCH_SORT_OPTIONS: { value: MatchSort; label: string }[] = [
  { value: "messages", label: "Messages" },
  { value: "calls", label: "Calls" },
  { value: "call_seconds", label: "Call time" },
  { value: "lifespan", label: "Lifespan" },
  { value: "last_active", label: "Last active" },
]

function MatchesLeaderboard({
  data,
  isLoading,
  sort,
  onSortChange,
}: {
  data: MatchPairRow[] | undefined
  isLoading: boolean
  sort: MatchSort
  onSortChange: (value: MatchSort) => void
}) {
  const rows = data ?? []
  return (
    <section>
      <div className="mb-1 flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Most active matches
        </h2>
        <Select
          value={sort}
          onValueChange={(v) => v && onSortChange(v as MatchSort)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MATCH_SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="mb-3 text-xs text-muted-foreground/70">
        Top matched pairs ranked by the selected metric. Engagement is
        activity-based (messages, calls, conversation lifespan) — not true time
        spent together.
      </p>
      <Card>
        <CardContent className="overflow-x-auto px-0">
          {isLoading ? (
            <div className="space-y-2 px-6 py-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              No matched pairs with conversations yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-6 py-2 text-left font-medium">Pair</th>
                  <th className="px-3 py-2 text-right font-medium">Messages</th>
                  <th className="px-3 py-2 text-right font-medium">Calls</th>
                  <th className="px-3 py-2 text-right font-medium">Call time</th>
                  <th className="px-3 py-2 text-right font-medium">Lifespan</th>
                  <th className="px-3 py-2 text-right font-medium">Matched</th>
                  <th className="px-6 py-2 text-right font-medium">
                    Last active
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={`${p.user1} ${p.user2}`}
                    className="border-b last:border-0"
                  >
                    <td className="px-6 py-2 font-medium">
                      {p.user1} ↔ {p.user2}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {p.message_count.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {p.call_count.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatDuration(p.call_seconds)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatSpan(
                        p.convo_started_at ?? p.first_message_at,
                        p.last_message_at,
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatDate(p.matched_at)}
                    </td>
                    <td className="px-6 py-2 text-right tabular-nums">
                      {formatDate(p.last_message_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function ReferralBars({ sources }: { sources: Record<string, number> }) {
  const entries = Object.entries(sources).sort((a, b) => b[1] - a[1])
  const max = Math.max(...entries.map(([, v]) => v), 1)
  return (
    <ul className="space-y-3">
      {entries.map(([source, count]) => (
        <li key={source} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium capitalize">{source || "(unspecified)"}</span>
            <span className="text-muted-foreground tabular-nums">{count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
