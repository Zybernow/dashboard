import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"
import {
  users,
  communities,
  communityMembers,
  dailyCallStats,
} from "@/db/prod/schema"
import { getActiveCallCount, getOnlineUserCount } from "@/lib/redis"
import type { Telemetry } from "@/lib/zyber-types"

export async function GET() {
  const auth = await requireSection("telemetry")
  if (auth.error) return auth.error

  try {
    const [userAgg, communityAgg, memberAgg, callsAgg, liveUsers, activeCalls] =
      await Promise.all([
      dbProd
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where ${users.isActive} = true and ${users.isBanned} = false)::int`,
          disabled: sql<number>`count(*) filter (where ${users.isBanned} = true)::int`,
          new_24h: sql<number>`count(*) filter (where ${users.createdAt} > now() - interval '1 day')::int`,
          new_7d: sql<number>`count(*) filter (where ${users.createdAt} > now() - interval '7 days')::int`,
          new_30d: sql<number>`count(*) filter (where ${users.createdAt} > now() - interval '30 days')::int`,
        })
        .from(users),
      dbProd
        .select({ total: sql<number>`count(*)::int` })
        .from(communities),
      dbProd
        .select({ total: sql<number>`count(*)::int` })
        .from(communityMembers),
      dbProd
        .select({
          totalSeconds: sql<number>`coalesce(sum(${dailyCallStats.totalSeconds}), 0)::bigint`,
        })
        .from(dailyCallStats),
      getOnlineUserCount(),
      getActiveCallCount(),
    ])

    const u = userAgg[0]
    const payload: Telemetry = {
      users: {
        total: u.total,
        active: u.active,
        disabled: u.disabled,
        live: liveUsers,
        new_24h: u.new_24h,
        new_7d: u.new_7d,
        new_30d: u.new_30d,
      },
      community: {
        total: communityAgg[0].total,
        total_members: memberAgg[0].total,
      },
      calls: {
        active: activeCalls,
        total_seconds: Number(callsAgg[0].totalSeconds),
      },
    }
    return NextResponse.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
