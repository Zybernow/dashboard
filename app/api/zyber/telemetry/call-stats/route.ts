import { type NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"
import { dailyCallStats } from "@/db/prod/schema"
import type { DailyCallStatsResponse } from "@/lib/zyber-types"

export async function GET(req: NextRequest) {
  const auth = await requireSection("telemetry")
  if (auth.error) return auth.error

  const raw = req.nextUrl.searchParams.get("days") ?? "30"
  const parsed = Number.parseInt(raw, 10)
  const days = Math.min(365, Math.max(7, Number.isFinite(parsed) ? parsed : 30))

  try {
    const rows = await dbProd
      .select({
        date: sql<string>`to_char(${dailyCallStats.date}, 'YYYY-MM-DD')`,
        total_seconds: sql<number>`${dailyCallStats.totalSeconds}::bigint`,
      })
      .from(dailyCallStats)
      .where(sql`${dailyCallStats.date} >= current_date - ${sql.raw(String(days - 1))}::int`)
      .orderBy(sql`${dailyCallStats.date} asc`)

    const payload: DailyCallStatsResponse = {
      stats: rows.map((r) => ({
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
