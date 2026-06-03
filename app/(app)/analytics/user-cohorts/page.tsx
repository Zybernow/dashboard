// app/(app)/analytics/user-cohorts/page.tsx
"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetcher"
import { AnalyticsSectionCard } from "@/components/analytics/section-card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber, formatPercent } from "@/lib/analytics-utils"

type WeeklyCohort = {
  signup_week: string
  users_signed_up: number
  onboarded_rate: number
  conversation_rate: number
  meaningful_match_rate: number
}

type CohortsData = {
  new_user_conversion: {
    total_users: number
    onboarded_users: number
    started_conversations: number
    meaningful_matches: number
  }
  weekly_signup_cohorts: WeeklyCohort[]
}

function HealthBadge({ rate }: { rate: number }) {
  if (rate >= 0.2)
    return <span className="inline-flex rounded-full px-2 py-0.5 text-xs bg-green-500/10 text-green-400">Excellent</span>
  if (rate >= 0.1)
    return <span className="inline-flex rounded-full px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-400">Average</span>
  return <span className="inline-flex rounded-full px-2 py-0.5 text-xs bg-red-500/10 text-red-400">Weak</span>
}

export default function UserCohortsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "user-cohorts"],
    queryFn: () => apiFetch<CohortsData>("/api/zyber/analytics/user-cohorts"),
    staleTime: 5 * 60 * 1000,
  })

  const cohorts = useMemo(() => data?.weekly_signup_cohorts ?? [], [data?.weekly_signup_cohorts])

  const bestCohort = useMemo(
    () => [...cohorts].sort((a, b) => b.meaningful_match_rate - a.meaningful_match_rate)[0],
    [cohorts],
  )

  const worstCohort = useMemo(
    () => [...cohorts].sort((a, b) => a.meaningful_match_rate - b.meaningful_match_rate)[0],
    [cohorts],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">User Cohorts</h1>
        <p className="text-sm text-muted-foreground">
          Weekly cohort analysis — how each signup week progresses through the funnel.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-5">
            <p className="text-xs text-muted-foreground mb-2">🏆 Best Cohort</p>
            <p className="text-lg font-semibold">{bestCohort?.signup_week ?? "—"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {bestCohort ? `${formatNumber(bestCohort.users_signed_up)} users` : "—"}
            </p>
            <p className="text-green-400 mt-2 font-medium">
              {bestCohort ? formatPercent(bestCohort.meaningful_match_rate) : "—"} meaningful matches
            </p>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <p className="text-xs text-muted-foreground mb-2">⚠️ Weakest Cohort</p>
            <p className="text-lg font-semibold">{worstCohort?.signup_week ?? "—"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {worstCohort ? `${formatNumber(worstCohort.users_signed_up)} users` : "—"}
            </p>
            <p className="text-red-400 mt-2 font-medium">
              {worstCohort ? formatPercent(worstCohort.meaningful_match_rate) : "—"} meaningful matches
            </p>
          </div>
        </div>
      )}

      <AnalyticsSectionCard title="Weekly Cohort Performance" subtitle="Each signup cohort's progression — last 12 weeks">
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-2 pr-4 text-left font-medium">Signup Week</th>
                  <th className="py-2 pr-4 text-right font-medium">Users</th>
                  <th className="py-2 pr-4 text-right font-medium">Onboarded %</th>
                  <th className="py-2 pr-4 text-right font-medium">Conversation %</th>
                  <th className="py-2 pr-4 text-right font-medium">Meaningful Match %</th>
                  <th className="py-2 text-right font-medium">Health</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      No cohort data yet.
                    </td>
                  </tr>
                ) : (
                  cohorts.map((c) => (
                    <tr key={c.signup_week} className="border-b last:border-0">
                      <td className="py-2 pr-4">{c.signup_week}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(c.users_signed_up)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatPercent(c.onboarded_rate)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatPercent(c.conversation_rate)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatPercent(c.meaningful_match_rate)}</td>
                      <td className="py-2 text-right">
                        <HealthBadge rate={c.meaningful_match_rate} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </AnalyticsSectionCard>

      <AnalyticsSectionCard title="Insights" subtitle="Key observations from cohort performance">
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
              <p className="text-sm font-medium text-green-400 mb-1">🏆 Best Performing Cohort</p>
              <p className="text-sm text-muted-foreground">
                Users who signed up on{" "}
                <span className="text-foreground font-medium">{bestCohort?.signup_week ?? "—"}</span>{" "}
                achieved a{" "}
                <span className="text-green-400 font-medium">
                  {bestCohort ? formatPercent(bestCohort.meaningful_match_rate) : "—"}
                </span>{" "}
                meaningful match rate.
              </p>
            </div>
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm font-medium text-red-400 mb-1">⚠️ Cohort Requiring Attention</p>
              <p className="text-sm text-muted-foreground">
                The{" "}
                <span className="text-foreground font-medium">{worstCohort?.signup_week ?? "—"}</span>{" "}
                cohort converted at only{" "}
                <span className="text-red-400 font-medium">
                  {worstCohort ? formatPercent(worstCohort.meaningful_match_rate) : "—"}
                </span>
                , indicating onboarding or matching quality issues.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/10 p-4">
              <p className="text-sm font-medium mb-1">💡 Recommendation</p>
              <p className="text-sm text-muted-foreground">
                Compare onboarding completion, profile quality, and first-match speed between the
                strongest and weakest cohorts to identify which changes are driving higher success.
              </p>
            </div>
          </div>
        )}
      </AnalyticsSectionCard>
    </div>
  )
}
