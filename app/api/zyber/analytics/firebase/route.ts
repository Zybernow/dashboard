import { NextResponse } from "next/server"
import { requireSection } from "@/lib/api-route"
import { ga4Client, ga4PropertyPath } from "@/lib/ga4"
import type {
  FirebaseMetrics,
  WindowedCount,
} from "@/lib/zyber-types"

// Each entry corresponds to one column in the GA4 response — order matters
// because we read row.metricValues by index.
const METRIC_NAMES = [
  "sessions",
  "activeUsers",
  "averageSessionDuration",
] as const

// Date ranges queried in parallel. "Total" uses GA4's max retention proxy of
// 365 days — Firebase's default retention is 2 or 14 months depending on
// project tier, so this is a practical upper bound rather than truly "all-time".
const DATE_RANGES = [
  { name: "total", startDate: "365daysAgo", endDate: "today" },
  { name: "last_24h", startDate: "1daysAgo", endDate: "today" },
  { name: "last_7d", startDate: "7daysAgo", endDate: "today" },
  { name: "last_30d", startDate: "30daysAgo", endDate: "today" },
] as const

// Custom events worth pulling counts for — pre-selected from the Flutter
// app's instrumentation (lib/core/services/analytics_service.dart). Add or
// remove freely; the endpoint returns whatever's listed here.
const TRACKED_EVENTS = [
  "profile_swiped",
  "mutual_match_found",
  "chat_message_sent",
  "voice_call_started",
  "voice_call_ended",
  "session_start",
  "user_engagement",
  "screen_view",
  "community_viewed",
] as const

type RangeKey = (typeof DATE_RANGES)[number]["name"]

function emptyWindow(): WindowedCount {
  return { total: 0, last_24h: 0, last_7d: 0, last_30d: 0 }
}

function setWindow(w: WindowedCount, key: RangeKey, value: number): void {
  if (key === "total") w.total = value
  else if (key === "last_24h") w.last_24h = value
  else if (key === "last_7d") w.last_7d = value
  else if (key === "last_30d") w.last_30d = value
}

export async function GET() {
  const auth = await requireSection("telemetry")
  if (auth.error) return auth.error

  try {
    const client = ga4Client()
    const property = ga4PropertyPath()

    // Two calls: top-line metrics (sessions/users/duration) keyed by date range,
    // and event counts keyed by date range × event name.
    const [topResp] = await client.runReport({
      property,
      dateRanges: DATE_RANGES.map((d) => ({
        name: d.name,
        startDate: d.startDate,
        endDate: d.endDate,
      })),
      metrics: METRIC_NAMES.map((name) => ({ name })),
    })

    const [eventsResp] = await client.runReport({
      property,
      dateRanges: DATE_RANGES.map((d) => ({
        name: d.name,
        startDate: d.startDate,
        endDate: d.endDate,
      })),
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          inListFilter: { values: [...TRACKED_EVENTS] },
        },
      },
    })

    const sessions = emptyWindow()
    const activeUsers = emptyWindow()
    const avgSessionDuration = emptyWindow()

    // Top-line response: one row per date range. `dateRange` dimension is
    // implicit when multiple ranges are supplied — its value lives on
    // row.dimensionValues[0].value as the range name we set above.
    for (const row of topResp.rows ?? []) {
      const rangeName = row.dimensionValues?.[0]?.value as RangeKey | undefined
      if (!rangeName) continue
      const [sess, users, avgDur] = (row.metricValues ?? []).map((v) =>
        Number(v.value ?? 0),
      )
      setWindow(sessions, rangeName, Math.round(sess ?? 0))
      setWindow(activeUsers, rangeName, Math.round(users ?? 0))
      setWindow(avgSessionDuration, rangeName, Math.round(avgDur ?? 0))
    }

    // Events response: one row per (event name × date range). When multiple
    // dateRanges are supplied, GA4 appends an implicit `dateRange` dimension
    // *after* the explicit dimensions — so order is [eventName, dateRange].
    const events: Record<string, WindowedCount> = {}
    for (const name of TRACKED_EVENTS) {
      events[name] = emptyWindow()
    }
    for (const row of eventsResp.rows ?? []) {
      const eventName = row.dimensionValues?.[0]?.value
      const rangeName = row.dimensionValues?.[1]?.value as RangeKey | undefined
      const count = Number(row.metricValues?.[0]?.value ?? 0)
      if (!rangeName || !eventName || !events[eventName]) continue
      setWindow(events[eventName], rangeName, Math.round(count))
    }

    const payload: FirebaseMetrics = {
      sessions,
      active_users: activeUsers,
      avg_session_duration_seconds: avgSessionDuration,
      events,
    }
    return NextResponse.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
