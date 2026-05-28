import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"
import {
  analyticsEvents,
  requests,
  users,
} from "@/db/prod/schema"
import type { EngagementMetrics, WindowedCount } from "@/lib/zyber-types"

// Avg-engagement subqueries materialize per-session durations and then
// average them. analytics_events has no session_id-only index, so the
// grouped scan can be heavy on large windows — flag if this gets slow.
function avgSessionDurationExpr(intervalDays: number) {
  const interval = sql.raw(`interval '${intervalDays} days'`)
  return sql<number>`coalesce((
    select avg(extract(epoch from (max_ts - min_ts)))::float
    from (
      select max(${analyticsEvents.serverTs}) as max_ts,
             min(${analyticsEvents.serverTs}) as min_ts
      from ${analyticsEvents}
      where ${analyticsEvents.serverTs} >= now() - ${interval}
      group by ${analyticsEvents.sessionId}
    ) s
  ), 0)::float`
}

const avgSessionDurationAllTime = sql<number>`coalesce((
  select avg(extract(epoch from (max_ts - min_ts)))::float
  from (
    select max(${analyticsEvents.serverTs}) as max_ts,
           min(${analyticsEvents.serverTs}) as min_ts
    from ${analyticsEvents}
    group by ${analyticsEvents.sessionId}
  ) s
), 0)::float`

export async function GET() {
  const auth = await requireSection("telemetry")
  if (auth.error) return auth.error

  try {
    const [userAgg, requestAgg, eventsAgg, avgAgg] = await Promise.all([
      dbProd
        .select({
          onboarded_total: sql<number>`count(*) filter (where ${users.isOnboardingComplete})::int`,
          onboarded_24h: sql<number>`count(*) filter (where ${users.isOnboardingComplete} and ${users.createdAt} > now() - interval '1 day')::int`,
          onboarded_7d: sql<number>`count(*) filter (where ${users.isOnboardingComplete} and ${users.createdAt} > now() - interval '7 days')::int`,
          onboarded_30d: sql<number>`count(*) filter (where ${users.isOnboardingComplete} and ${users.createdAt} > now() - interval '30 days')::int`,
          verified_total: sql<number>`count(*) filter (where ${users.workEmailVerified})::int`,
          verified_24h: sql<number>`count(*) filter (where ${users.workEmailVerified} and ${users.createdAt} > now() - interval '1 day')::int`,
          verified_7d: sql<number>`count(*) filter (where ${users.workEmailVerified} and ${users.createdAt} > now() - interval '7 days')::int`,
          verified_30d: sql<number>`count(*) filter (where ${users.workEmailVerified} and ${users.createdAt} > now() - interval '30 days')::int`,
        })
        .from(users),
      dbProd
        .select({
          matches_total: sql<number>`count(*) filter (where ${requests.intent1} and ${requests.intent2})::int`,
          matches_24h: sql<number>`count(*) filter (where ${requests.intent1} and ${requests.intent2} and ${requests.createdAt} > now() - interval '1 day')::int`,
          matches_7d: sql<number>`count(*) filter (where ${requests.intent1} and ${requests.intent2} and ${requests.createdAt} > now() - interval '7 days')::int`,
          matches_30d: sql<number>`count(*) filter (where ${requests.intent1} and ${requests.intent2} and ${requests.createdAt} > now() - interval '30 days')::int`,
          swipes_total: sql<number>`count(*)::int`,
          swipes_24h: sql<number>`count(*) filter (where ${requests.createdAt} > now() - interval '1 day')::int`,
          swipes_7d: sql<number>`count(*) filter (where ${requests.createdAt} > now() - interval '7 days')::int`,
          swipes_30d: sql<number>`count(*) filter (where ${requests.createdAt} > now() - interval '30 days')::int`,
        })
        .from(requests),
      dbProd
        .select({
          sessions_total: sql<number>`count(distinct ${analyticsEvents.sessionId})::int`,
          sessions_24h: sql<number>`count(distinct ${analyticsEvents.sessionId}) filter (where ${analyticsEvents.serverTs} > now() - interval '1 day')::int`,
          sessions_7d: sql<number>`count(distinct ${analyticsEvents.sessionId}) filter (where ${analyticsEvents.serverTs} > now() - interval '7 days')::int`,
          sessions_30d: sql<number>`count(distinct ${analyticsEvents.sessionId}) filter (where ${analyticsEvents.serverTs} > now() - interval '30 days')::int`,
        })
        .from(analyticsEvents),
      dbProd
        .select({
          avg_total: avgSessionDurationAllTime,
          avg_24h: avgSessionDurationExpr(1),
          avg_7d: avgSessionDurationExpr(7),
          avg_30d: avgSessionDurationExpr(30),
        })
        .from(sql`(select 1) as _`),
    ])

    const u = userAgg[0]
    const r = requestAgg[0]
    const e = eventsAgg[0]
    const a = avgAgg[0]

    const window = (
      total: number,
      h24: number,
      d7: number,
      d30: number,
    ): WindowedCount => ({
      total,
      last_24h: h24,
      last_7d: d7,
      last_30d: d30,
    })

    const payload: EngagementMetrics = {
      onboarded: window(
        u.onboarded_total,
        u.onboarded_24h,
        u.onboarded_7d,
        u.onboarded_30d,
      ),
      verified: window(
        u.verified_total,
        u.verified_24h,
        u.verified_7d,
        u.verified_30d,
      ),
      matches: window(
        r.matches_total,
        r.matches_24h,
        r.matches_7d,
        r.matches_30d,
      ),
      swipes: window(
        r.swipes_total,
        r.swipes_24h,
        r.swipes_7d,
        r.swipes_30d,
      ),
      sessions: window(
        e.sessions_total,
        e.sessions_24h,
        e.sessions_7d,
        e.sessions_30d,
      ),
      avg_engagement_seconds: window(
        Number(a.avg_total) || 0,
        Number(a.avg_24h) || 0,
        Number(a.avg_7d) || 0,
        Number(a.avg_30d) || 0,
      ),
    }

    return NextResponse.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
