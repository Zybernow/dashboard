// app/api/zyber/analytics/platform-metrics/route.ts
import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"

export async function GET() {
  const auth = await requireSection("analytics-overview")
  if (auth.error) return auth.error

  try {
    const [kpiRows, growthRows, newUserRows, matchTrendRows] = await Promise.all([
      dbProd.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM users)::int AS total_users,
          (SELECT COUNT(DISTINCT participant) FROM (
            SELECT conversation_user1 AS participant FROM messages
            WHERE created_at >= NOW() - INTERVAL '15 minutes'
            UNION
            SELECT conversation_user2 AS participant FROM messages
            WHERE created_at >= NOW() - INTERVAL '15 minutes'
          ) live_participants)::int AS live_users_15m,
          (SELECT COUNT(DISTINCT participant) FROM (
            SELECT conversation_user1 AS participant FROM messages
            UNION
            SELECT conversation_user2 AS participant FROM messages
          ) participants)::int AS participants,
          (SELECT COUNT(*) FROM messages)::int AS messages_sent,
          (SELECT COUNT(*) FROM conversations)::int AS total_conversations,
          (SELECT COUNT(*) FROM (
            SELECT c.user1, c.user2
            FROM conversations c
            LEFT JOIN messages m ON (
              (m.conversation_user1 = c.user1 AND m.conversation_user2 = c.user2)
              OR (m.conversation_user1 = c.user2 AND m.conversation_user2 = c.user1)
            )
            GROUP BY c.user1, c.user2, c.created_at
            HAVING COUNT(m.id) >= 10
          ) meaningful_pairs)::int AS meaningful_matches,
          COALESCE((
            SELECT AVG(msg_count) FROM (
              SELECT COUNT(m.id) AS msg_count
              FROM conversations c
              LEFT JOIN messages m ON (
                (m.conversation_user1 = c.user1 AND m.conversation_user2 = c.user2)
                OR (m.conversation_user1 = c.user2 AND m.conversation_user2 = c.user1)
              )
              GROUP BY c.user1, c.user2, c.created_at
            ) mc
          ), 0)::float AS avg_messages_per_match,
          COALESCE((
            SELECT AVG(call_duration_seconds) FROM messages
            WHERE message_type = 'call' AND call_duration_seconds IS NOT NULL
          ), 0)::float AS avg_call_duration_seconds
      `),
      dbProd.execute(sql`
        WITH days AS (
          SELECT generate_series(
            DATE_TRUNC('day', NOW()) - INTERVAL '29 days',
            DATE_TRUNC('day', NOW()),
            INTERVAL '1 day'
          ) AS day
        )
        SELECT
          TO_CHAR(days.day, 'Mon DD') AS date,
          COUNT(u.username)::int AS value
        FROM days
        LEFT JOIN users u ON u.created_at < days.day + INTERVAL '1 day'
        GROUP BY days.day
        ORDER BY days.day
      `),
      dbProd.execute(sql`
        WITH days AS (
          SELECT generate_series(
            DATE_TRUNC('day', NOW()) - INTERVAL '29 days',
            DATE_TRUNC('day', NOW()),
            INTERVAL '1 day'
          ) AS day
        )
        SELECT
          TO_CHAR(days.day, 'Mon DD') AS date,
          COALESCE(COUNT(u.username) FILTER (
            WHERE u.created_at >= days.day AND u.created_at < days.day + INTERVAL '1 day'
          ), 0)::int AS value
        FROM days
        LEFT JOIN users u ON TRUE
        GROUP BY days.day
        ORDER BY days.day
      `),
      dbProd.execute(sql`
        WITH weeks AS (
          SELECT generate_series(
            DATE_TRUNC('week', NOW()) - INTERVAL '11 weeks',
            DATE_TRUNC('week', NOW()),
            INTERVAL '1 week'
          ) AS week
        ),
        meaningful_pairs AS (
          SELECT DATE_TRUNC('week', c.created_at) AS week
          FROM conversations c
          LEFT JOIN messages m ON (
            (m.conversation_user1 = c.user1 AND m.conversation_user2 = c.user2)
            OR (m.conversation_user1 = c.user2 AND m.conversation_user2 = c.user1)
          )
          WHERE c.created_at >= DATE_TRUNC('week', NOW()) - INTERVAL '11 weeks'
          GROUP BY DATE_TRUNC('week', c.created_at), c.user1, c.user2, c.created_at
          HAVING COUNT(m.id) >= 10
        )
        SELECT
          TO_CHAR(weeks.week, 'Mon DD') AS date,
          COUNT(meaningful_pairs.week)::int AS value
        FROM weeks
        LEFT JOIN meaningful_pairs ON meaningful_pairs.week = weeks.week
        GROUP BY weeks.week
        ORDER BY weeks.week
      `),
    ])

    const k = kpiRows[0] as any
    const totalUsers = Number(k.total_users)
    const participants = Number(k.participants)
    const totalConversations = Number(k.total_conversations)
    const meaningfulMatches = Number(k.meaningful_matches)

    return NextResponse.json({
      total_users: totalUsers,
      live_users_15m: Number(k.live_users_15m),
      participation_rate: totalUsers > 0 ? participants / totalUsers : 0,
      meaningful_matches: meaningfulMatches,
      messages_sent: Number(k.messages_sent),
      match_conversion_rate: totalConversations > 0 ? meaningfulMatches / totalConversations : 0,
      avg_messages_per_match: Number(k.avg_messages_per_match),
      avg_call_duration_seconds: Number(k.avg_call_duration_seconds),
      user_growth: (growthRows as any[]).map((r) => ({ date: r.date, value: Number(r.value) })),
      new_users: (newUserRows as any[]).map((r) => ({ date: r.date, value: Number(r.value) })),
      meaningful_match_trend: (matchTrendRows as any[]).map((r) => ({ date: r.date, value: Number(r.value) })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
