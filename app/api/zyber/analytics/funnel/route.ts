// app/api/zyber/analytics/funnel/route.ts
import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"

type FunnelPeriod = "7d" | "30d" | "all"

function periodInterval(period: FunnelPeriod): string {
  if (period === "7d") return "7 days"
  if (period === "30d") return "30 days"
  return ""
}

export async function GET(request: Request) {
  const auth = await requireSection("analytics-funnel")
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const period = (searchParams.get("period") ?? "30d") as FunnelPeriod
  const interval = periodInterval(period)
  const cohortFilter = interval
    ? sql.raw(`WHERE created_at >= NOW() - INTERVAL '${interval}'`)
    : sql.raw("")

  try {
    const rows = await dbProd.execute(sql`
      WITH cohort_users AS (
        SELECT username, is_onboarding_complete
        FROM users
        ${cohortFilter}
      ),
      conversation_participants AS (
        SELECT DISTINCT participant FROM (
          SELECT user1 AS participant FROM conversations
          UNION
          SELECT user2 AS participant FROM conversations
        ) p
      ),
      message_participants AS (
        SELECT DISTINCT participant FROM (
          SELECT conversation_user1 AS participant FROM messages
          UNION
          SELECT conversation_user2 AS participant FROM messages
        ) p
      ),
      meaningful_participants AS (
        SELECT DISTINCT participant FROM (
          SELECT c.user1 AS participant
          FROM conversations c
          LEFT JOIN messages m ON (
            (m.conversation_user1 = c.user1 AND m.conversation_user2 = c.user2)
            OR (m.conversation_user1 = c.user2 AND m.conversation_user2 = c.user1)
          )
          GROUP BY c.user1, c.user2, c.created_at
          HAVING COUNT(m.id) >= 10
          UNION
          SELECT c.user2 AS participant
          FROM conversations c
          LEFT JOIN messages m ON (
            (m.conversation_user1 = c.user1 AND m.conversation_user2 = c.user2)
            OR (m.conversation_user1 = c.user2 AND m.conversation_user2 = c.user1)
          )
          GROUP BY c.user1, c.user2, c.created_at
          HAVING COUNT(m.id) >= 10
        ) p
      )
      SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE is_onboarding_complete = TRUE)::int AS onboarded_users,
        COUNT(*) FILTER (WHERE username IN (SELECT participant FROM conversation_participants))::int AS conversation_users,
        COUNT(*) FILTER (WHERE username IN (SELECT participant FROM meaningful_participants))::int AS meaningful_match_users,
        COUNT(*) FILTER (WHERE username IN (SELECT participant FROM message_participants))::int AS first_message_users
      FROM cohort_users
    `)

    interface FunnelRow extends Record<string, unknown> {
      total_users: string | number
      onboarded_users: string | number
      conversation_users: string | number
      meaningful_match_users: string | number
      first_message_users: string | number
    }

    const row = (rows as unknown as FunnelRow[])[0]
    const onboardedUsers = Number(row?.onboarded_users ?? 0)
    const firstMessageUsers = Number(row?.first_message_users ?? 0)

    return NextResponse.json({
      period,
      total_users: Number(row?.total_users ?? 0),
      onboarded_users: onboardedUsers,
      conversation_users: Number(row?.conversation_users ?? 0),
      meaningful_match_users: Number(row?.meaningful_match_users ?? 0),
      first_message_users: firstMessageUsers,
      first_message_sent_rate: onboardedUsers > 0 ? firstMessageUsers / onboardedUsers : 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
