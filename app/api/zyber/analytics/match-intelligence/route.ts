// app/api/zyber/analytics/match-intelligence/route.ts
import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"

type MatchPeriod = "7d" | "30d" | "all"

function tokenize(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) return value.map((i) => String(i).trim().toLowerCase()).filter(Boolean)
  const raw = String(value).trim()
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map((i) => String(i).trim().toLowerCase()).filter(Boolean)
  } catch {}
  return raw.split(/[,\n|]/).map((i) => i.trim().toLowerCase()).filter(Boolean)
}

function overlapCount(left: unknown, right: unknown): number {
  const l = new Set(tokenize(left))
  const r = new Set(tokenize(right))
  let n = 0
  l.forEach((t) => { if (r.has(t)) n++ })
  return n
}

export async function GET(request: Request) {
  const auth = await requireSection("analytics-match-intelligence")
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const period = (searchParams.get("period") ?? "all") as MatchPeriod

  let periodFilter = sql.raw("")
  if (period === "7d") periodFilter = sql.raw("AND m.created_at >= NOW() - INTERVAL '7 days'")
  if (period === "30d") periodFilter = sql.raw("AND m.created_at >= NOW() - INTERVAL '30 days'")

  try {
    const [pairRows, driverRows, replyRows] = await Promise.all([
      // Match pairs with stats
      dbProd.execute(sql`
        SELECT
          c.user1,
          c.user2,
          c.created_at AS matched_at,
          COUNT(m.id)::int AS message_count,
          COUNT(m.id) FILTER (WHERE m.message_type = 'call')::int AS call_count,
          COALESCE(SUM(m.call_duration_seconds), 0)::int AS call_seconds,
          MIN(m.created_at) AS first_message_at,
          MAX(m.created_at) AS last_message_at,
          c.created_at AS conversation_started_at
        FROM conversations c
        LEFT JOIN messages m ON (
          (m.conversation_user1 = c.user1 AND m.conversation_user2 = c.user2)
          OR (m.conversation_user1 = c.user2 AND m.conversation_user2 = c.user1)
        ) ${periodFilter}
        GROUP BY c.user1, c.user2, c.created_at
        ORDER BY c.created_at DESC
      `),
      // Match drivers: profiles for overlap analysis
      dbProd.execute(sql`
        SELECT
          c.user1,
          c.user2,
          COUNT(m.id)::int AS message_count,
          COUNT(m.id) FILTER (WHERE m.message_type = 'call')::int AS call_count,
          u1.study_interests AS u1_study_interests,
          u2.study_interests AS u2_study_interests,
          u1.weekly_hustle AS u1_weekly_hustle,
          u2.weekly_hustle AS u2_weekly_hustle,
          u1.north_star AS u1_north_star,
          u2.north_star AS u2_north_star
        FROM conversations c
        LEFT JOIN messages m ON (
          (m.conversation_user1 = c.user1 AND m.conversation_user2 = c.user2)
          OR (m.conversation_user1 = c.user2 AND m.conversation_user2 = c.user1)
        )
        LEFT JOIN user_onboarding_profiles u1 ON u1.username = c.user1
        LEFT JOIN user_onboarding_profiles u2 ON u2.username = c.user2
        GROUP BY c.user1, c.user2, c.created_at,
          u1.study_interests, u2.study_interests,
          u1.weekly_hustle, u2.weekly_hustle,
          u1.north_star, u2.north_star
      `),
      // Reply times for median calculation
      dbProd.execute(sql`
        SELECT
          conversation_user1,
          conversation_user2,
          sender_username,
          created_at
        FROM messages
        ORDER BY conversation_user1, conversation_user2, created_at ASC
      `),
    ])

    interface DriverRow extends Record<string, unknown> {
      message_count: string | number
      call_count: string | number
      u1_study_interests: unknown
      u2_study_interests: unknown
      u1_weekly_hustle: unknown
      u2_weekly_hustle: unknown
      u1_north_star: unknown
      u2_north_star: unknown
    }

    interface ReplyRow extends Record<string, unknown> {
      conversation_user1: string
      conversation_user2: string
      sender_username: string
      created_at: string
    }

    interface PairRow extends Record<string, unknown> {
      user1: string
      user2: string
      matched_at: string
      message_count: string | number
      call_count: string | number
      call_seconds: string | number
      first_message_at: string | null
      last_message_at: string | null
      conversation_started_at: string | null
    }

    // --- Compute match quality distribution ---
    const pairs = (driverRows as unknown as DriverRow[]).map((row) => ({
      messageCount: Number(row.message_count),
      callCount: Number(row.call_count),
      meaningful: Number(row.message_count) >= 10,
      studyOverlap: overlapCount(row.u1_study_interests, row.u2_study_interests),
      goalOverlap: overlapCount(row.u1_weekly_hustle, row.u2_weekly_hustle),
      northStarOverlap: overlapCount(row.u1_north_star, row.u2_north_star),
    }))

    const buckets = [
      { bucket: "0–10", count: 0 },
      { bucket: "11–50", count: 0 },
      { bucket: "51–100", count: 0 },
      { bucket: "100+", count: 0 },
    ]
    pairs.forEach(({ messageCount }) => {
      if (messageCount <= 10) buckets[0].count++
      else if (messageCount <= 50) buckets[1].count++
      else if (messageCount <= 100) buckets[2].count++
      else buckets[3].count++
    })

    const avgMessagesPerMatch =
      pairs.length > 0 ? pairs.reduce((s, p) => s + p.messageCount, 0) / pairs.length : 0

    const withConversation = pairs.filter((p) => p.messageCount > 0)
    const withCalls = pairs.filter((p) => p.callCount > 0)
    const callEscalationRate =
      withConversation.length > 0 ? withCalls.length / withConversation.length : 0

    const survivalThresholds = [1, 3, 5, 10, 20, 50]
    const conversationSurvivalCurve = survivalThresholds.map((threshold) => {
      const count = pairs.filter((p) => p.messageCount >= threshold).length
      return { threshold, conversations: count, rate: pairs.length > 0 ? count / pairs.length : 0 }
    })

    // --- Reply time median ---
    const convMap = new Map<string, ReplyRow[]>()
    for (const row of replyRows as unknown as ReplyRow[]) {
      const key = [row.conversation_user1, row.conversation_user2].sort().join("__")
      if (!convMap.has(key)) convMap.set(key, [])
      convMap.get(key)!.push(row)
    }
    const replyTimes: number[] = []
    convMap.forEach((msgs) => {
      if (msgs.length < 2) return
      const firstSender = msgs[0].sender_username
      const firstReply = msgs.find((m) => m.sender_username !== firstSender)
      if (!firstReply) return
      const diff = (new Date(firstReply.created_at).getTime() - new Date(msgs[0].created_at).getTime()) / 60_000
      if (diff >= 0) replyTimes.push(diff)
    })
    const sorted = [...replyTimes].sort((a, b) => a - b)
    const medianReplyTime =
      sorted.length === 0
        ? 0
        : sorted.length % 2 === 1
        ? sorted[Math.floor(sorted.length / 2)]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2

    return NextResponse.json({
      matches: (pairRows as unknown as PairRow[]).map((r) => ({
        user1: r.user1,
        user2: r.user2,
        matched_at: r.matched_at,
        message_count: Number(r.message_count),
        call_count: Number(r.call_count),
        call_seconds: Number(r.call_seconds),
        first_message_at: r.first_message_at ?? null,
        last_message_at: r.last_message_at ?? null,
        conversation_started_at: r.conversation_started_at ?? null,
      })),
      avg_messages_per_match: avgMessagesPerMatch,
      call_escalation_rate: callEscalationRate,
      median_time_to_first_reply_minutes: Math.round(medianReplyTime),
      match_quality_distribution: buckets,
      conversation_survival_curve: conversationSurvivalCurve,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
