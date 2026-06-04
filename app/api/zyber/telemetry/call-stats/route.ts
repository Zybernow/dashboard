import { type NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"
import type { DailyCallStatsResponse } from "@/lib/zyber-types"

// Per-day call time is derived directly from the messages table, grouped by the
// day the call actually happened (created_at). We deliberately do NOT read the
// daily_call_stats aggregate: that table is incremented on the day a call record
// is *closed* (CURRENT_DATE in the Go writer), which for dropped/swept calls can
// be many days after the call occurred — dumping a backlog onto a single day and
// leaving the real days at zero. messages stores each call's correct duration and
// correct date, so aggregating it is correct by construction and self-healing.
export async function GET(req: NextRequest) {
  const auth = await requireSection("telemetry")
  if (auth.error) return auth.error

  const raw = req.nextUrl.searchParams.get("days") ?? "30"
  const parsed = Number.parseInt(raw, 10)
  const days = Math.min(365, Math.max(7, Number.isFinite(parsed) ? parsed : 30))
  const offset = sql.raw(String(days - 1)) // safe: days is a clamped integer

  try {
    const rows = await dbProd.execute(sql`
      WITH window_days AS (
        SELECT generate_series(
          current_date - ${offset}::int,
          current_date,
          interval '1 day'
        )::date AS day
      ),
      per_day AS (
        SELECT
          date(created_at) AS day,
          coalesce(sum(call_duration_seconds), 0)::bigint AS total_seconds
        FROM messages
        WHERE message_type = 'call_record'
          AND created_at >= current_date - ${offset}::int
        GROUP BY date(created_at)
      )
      SELECT
        to_char(w.day, 'YYYY-MM-DD') AS date,
        coalesce(p.total_seconds, 0)::bigint AS total_seconds
      FROM window_days w
      LEFT JOIN per_day p ON p.day = w.day
      ORDER BY w.day ASC
    `)

    interface Row extends Record<string, unknown> {
      date: string
      total_seconds: string | number
    }

    const payload: DailyCallStatsResponse = {
      stats: (rows as unknown as Row[]).map((r) => ({
        date: r.date,
        total_seconds: Number(r.total_seconds),
      })),
      days,
    }
    return NextResponse.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
