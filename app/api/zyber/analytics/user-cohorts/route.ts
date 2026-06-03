// app/api/zyber/analytics/user-cohorts/route.ts
import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"

export async function GET() {
  const auth = await requireSection("analytics-user-cohorts")
  if (auth.error) return auth.error

  try {
    const [summaryRows, weeklyRows] = await Promise.all([
      dbProd.execute(sql`
        WITH cohort_users AS (
          SELECT username, is_onboarding_complete
          FROM users
          WHERE created_at >= NOW() - INTERVAL '30 days'
        ),
        conversation_participants AS (
          SELECT DISTINCT participant FROM (
            SELECT user1 AS participant FROM conversations
            UNION
            SELECT user2 AS participant FROM conversations
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
          COUNT(*) FILTER (WHERE username IN (SELECT participant FROM conversation_participants))::int AS started_conversations,
          COUNT(*) FILTER (WHERE username IN (SELECT participant FROM meaningful_participants))::int AS meaningful_matches
        FROM cohort_users
      `),
      dbProd.execute(sql`
        WITH user_weeks AS (
          SELECT username, DATE_TRUNC('week', created_at) AS signup_week, is_onboarding_complete
          FROM users
          WHERE created_at >= NOW() - INTERVAL '84 days'
        ),
        conversation_participants AS (
          SELECT DISTINCT participant FROM (
            SELECT user1 AS participant FROM conversations
            UNION
            SELECT user2 AS participant FROM conversations
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
          TO_CHAR(signup_week, 'YYYY-MM-DD') AS signup_week,
          COUNT(*)::int AS users_signed_up,
          COUNT(*) FILTER (WHERE is_onboarding_complete = TRUE)::int AS onboarded_users,
          COUNT(*) FILTER (WHERE username IN (SELECT participant FROM conversation_participants))::int AS conversation_users,
          COUNT(*) FILTER (WHERE username IN (SELECT participant FROM meaningful_participants))::int AS meaningful_match_users
        FROM user_weeks
        GROUP BY signup_week
        ORDER BY signup_week DESC
      `),
    ])

    const s = (summaryRows as any[])[0]

    return NextResponse.json({
      new_user_conversion: {
        total_users: Number(s?.total_users ?? 0),
        onboarded_users: Number(s?.onboarded_users ?? 0),
        started_conversations: Number(s?.started_conversations ?? 0),
        meaningful_matches: Number(s?.meaningful_matches ?? 0),
      },
      weekly_signup_cohorts: (weeklyRows as any[]).map((row) => {
        const signedUp = Number(row.users_signed_up)
        return {
          signup_week: row.signup_week,
          users_signed_up: signedUp,
          onboarded_rate: signedUp > 0 ? Number(row.onboarded_users) / signedUp : 0,
          conversation_rate: signedUp > 0 ? Number(row.conversation_users) / signedUp : 0,
          meaningful_match_rate: signedUp > 0 ? Number(row.meaningful_match_users) / signedUp : 0,
        }
      }),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
