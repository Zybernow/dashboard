import { eq, ne, sql } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { zyberGet } from "@/lib/zyber-api"
import { dbProd } from "@/db/prod/drizzle"
import { communities, messages, users } from "@/db/prod/schema"
import type { Telemetry } from "@/lib/zyber-types"

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000)
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000)

export async function GET() {
  const auth = await requireSection("telemetry")
  if (auth.error) return auth.error

  try {
    const [userRows, communityRow, callRow, liveCount] = await Promise.all([
      dbProd
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where ${users.isActive} = true)::int`,
          disabled: sql<number>`count(*) filter (where ${users.isActive} = false)::int`,
          new_24h: sql<number>`count(*) filter (where ${users.createdAt} >= ${hoursAgo(24)})::int`,
          new_7d: sql<number>`count(*) filter (where ${users.createdAt} >= ${daysAgo(7)})::int`,
          new_30d: sql<number>`count(*) filter (where ${users.createdAt} >= ${daysAgo(30)})::int`,
        })
        .from(users),
      dbProd
        .select({ total: sql<number>`count(*)::int` })
        .from(communities)
        .where(ne(communities.status, "pending")),
      dbProd
        .select({
          active: sql<number>`count(*) filter (where ${messages.createdAt} >= ${hoursAgo(1)})::int`,
          total_seconds: sql<number>`coalesce(sum(${messages.callDurationSeconds}), 0)::bigint`,
        })
        .from(messages)
        .where(eq(messages.messageType, "call")),
      // Live user count requires Redis — fetch from Go backend, default to 0 on failure
      zyberGet<{ total: number }>("/admin/users/live")
        .then((r) => (typeof r.total === "number" ? r.total : 0))
        .catch((e) => {
          console.error("[telemetry] live count:", e instanceof Error ? e.message : e)
          return 0
        }),
    ])

    const u = userRows[0]
    const payload: Telemetry = {
      users: {
        total: u?.total ?? 0,
        active: u?.active ?? 0,
        disabled: u?.disabled ?? 0,
        live: liveCount,
        new_24h: u?.new_24h ?? 0,
        new_7d: u?.new_7d ?? 0,
        new_30d: u?.new_30d ?? 0,
      },
      community: {
        total: communityRow[0]?.total ?? 0,
        total_members: 0,
      },
      calls: {
        active: callRow[0]?.active ?? 0,
        total_seconds: Number(callRow[0]?.total_seconds ?? 0),
      },
    }
    return Response.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return Response.json({ error: message }, { status: 500 })
  }
}
