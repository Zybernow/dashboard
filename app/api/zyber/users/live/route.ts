import { type NextRequest } from "next/server"
import { inArray } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { redis } from "@/db/redis"
import { dbProd } from "@/db/prod/drizzle"
import { users } from "@/db/prod/schema"
import type { LiveUsersPage } from "@/lib/zyber-types"

// UserTTL matches Go backend: 3 minutes
const USER_TTL_SECONDS = 180

export async function GET(req: NextRequest) {
  const auth = await requireSection("live")
  if (auth.error) return auth.error

  const params = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10))
  const limit = Math.min(200, Math.max(1, parseInt(params.get("limit") ?? "50", 10)))

  try {
    const cutoff = Math.floor(Date.now() / 1000) - USER_TTL_SECONDS

    // Get all online usernames with their scores, newest first
    const raw = await redis.zrangebyscore(
      "online_users",
      cutoff,
      "+inf",
      "WITHSCORES",
    )

    // ioredis returns a flat array [member, score, member, score, ...]
    const entries: { username: string; score: number }[] = []
    for (let i = 0; i < raw.length; i += 2) {
      entries.push({ username: raw[i], score: parseFloat(raw[i + 1]) })
    }
    // Sort descending (most recently seen first)
    entries.sort((a, b) => b.score - a.score)

    const total = entries.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const offset = (page - 1) * limit
    const pageEntries = entries.slice(offset, offset + limit)

    // Enrich with DB profile data
    const usernames = pageEntries.map((e) => e.username)
    const dbRows =
      usernames.length > 0
        ? await dbProd
            .select({
              username: users.username,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              isActive: users.isActive,
              isBanned: users.isBanned,
            })
            .from(users)
            .where(inArray(users.username, usernames))
        : []

    const dbMap = new Map(dbRows.map((r) => [r.username, r]))

    const enriched = pageEntries.map((e) => {
      const db = dbMap.get(e.username)
      return {
        username: e.username,
        last_seen: e.score,
        first_name: db?.firstName,
        last_name: db?.lastName,
        email: db?.email,
        is_active: db?.isActive,
        is_banned: db?.isBanned,
      }
    })

    const payload: LiveUsersPage = {
      users: enriched,
      total,
      page,
      limit,
      total_pages: totalPages,
    }
    return Response.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    console.error("[live-users]", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
