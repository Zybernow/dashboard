import { type NextRequest, NextResponse } from "next/server"
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"
import {
  communities,
  communityEvents,
  eventAttendees,
  users,
} from "@/db/prod/schema"
import type { AdminEvent, AdminEventsPage } from "@/lib/zyber-types"

const SORT_COLUMNS = {
  start_time: communityEvents.startTime,
  title: communityEvents.title,
  created_at: communityEvents.createdAt,
  community_name: communities.name,
} as const

export async function GET(req: NextRequest) {
  const auth = await requireSection("events")
  if (auth.error) return auth.error

  // Maintainers only see events created by users from their colleges.
  const maintainerColleges =
    auth.role === "maintainer" && auth.maintainer.colleges.length > 0
      ? auth.maintainer.colleges
      : null

  const params = req.nextUrl.searchParams
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1)
  const limit = Math.min(
    200,
    Math.max(1, Number.parseInt(params.get("limit") ?? "50", 10) || 50),
  )
  const search = params.get("search")?.trim() ?? ""
  const communityIdRaw = params.get("community_id")
  const communityId = communityIdRaw ? Number.parseInt(communityIdRaw, 10) : 0
  const sort = params.get("sort") ?? "start_time"
  const order = params.get("order") ?? "desc"

  const attendeeCount = sql<number>`(select count(*)::int from ${eventAttendees} where ${eventAttendees.eventId} = ${communityEvents.id})`

  // Resolve creator usernames for maintainer college filter
  let creatorFilter: string[] | null = null
  if (maintainerColleges) {
    const creatorRows = await dbProd
      .select({ username: users.username })
      .from(users)
      .where(inArray(users.college, maintainerColleges))
    creatorFilter = creatorRows.map((r) => r.username)
    if (creatorFilter.length === 0) {
      return NextResponse.json({
        events: [],
        total: 0,
        page: 1,
        limit: 50,
        total_pages: 0,
      } satisfies AdminEventsPage)
    }
  }

  const conditions = []
  if (communityId > 0) {
    conditions.push(eq(communityEvents.communityId, communityId))
  }
  if (search) {
    const pat = `%${search}%`
    conditions.push(
      or(
        ilike(communityEvents.title, pat),
        ilike(communityEvents.location, pat),
        ilike(communityEvents.createdBy, pat),
      )!,
    )
  }
  if (creatorFilter) {
    conditions.push(inArray(communityEvents.createdBy, creatorFilter))
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const orderFn = order === "asc" ? asc : desc
  const orderBy =
    sort === "attendee_count"
      ? orderFn(attendeeCount)
      : orderFn(
          SORT_COLUMNS[sort as keyof typeof SORT_COLUMNS] ??
            communityEvents.startTime,
        )

  try {
    const [rows, totalRow] = await Promise.all([
      dbProd
        .select({
          id: communityEvents.id,
          community_id: communityEvents.communityId,
          community_name: sql<string>`coalesce(${communities.name}, '')`,
          community_slug: sql<string>`coalesce(${communities.slug}, '')`,
          title: communityEvents.title,
          description: communityEvents.description,
          location: communityEvents.location,
          start_time: communityEvents.startTime,
          end_time: communityEvents.endTime,
          created_by: communityEvents.createdBy,
          attendee_count: attendeeCount,
          created_at: communityEvents.createdAt,
        })
        .from(communityEvents)
        .leftJoin(communities, eq(communities.id, communityEvents.communityId))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit),
      dbProd
        .select({ count: sql<number>`count(*)::int` })
        .from(communityEvents)
        .where(whereClause),
    ])

    const total = totalRow[0]?.count ?? 0
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0

    const payload: AdminEventsPage = {
      events: rows.map((r) => ({
        id: r.id,
        community_id: r.community_id,
        community_name: r.community_name,
        community_slug: r.community_slug,
        title: r.title,
        description: r.description,
        location: r.location,
        start_time: r.start_time.toISOString(),
        end_time: r.end_time.toISOString(),
        created_by: r.created_by,
        attendee_count: r.attendee_count,
        created_at: r.created_at.toISOString(),
      })),
      total,
      page,
      limit,
      total_pages: totalPages,
    }
    return NextResponse.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSection("events")
  if (auth.error) return auth.error

  if (auth.role === "maintainer") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as
    | {
        community_id?: number
        title?: string
        description?: string
        location?: string
        created_by?: string
        start_time?: string
        end_time?: string
      }
    | null

  if (
    !body?.title ||
    !body.community_id ||
    !body.created_by ||
    !body.start_time ||
    !body.end_time
  ) {
    return NextResponse.json(
      {
        error:
          "community_id, title, created_by, start_time, and end_time are required",
      },
      { status: 400 },
    )
  }

  const startTime = new Date(body.start_time)
  const endTime = new Date(body.end_time)
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return NextResponse.json(
      { error: "invalid start_time or end_time" },
      { status: 400 },
    )
  }

  try {
    const inserted = await dbProd
      .insert(communityEvents)
      .values({
        communityId: body.community_id,
        title: body.title,
        description: body.description ?? "",
        location: body.location ?? "",
        startTime,
        endTime,
        createdBy: body.created_by,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    const e = inserted[0]
    const community = await dbProd
      .select({ name: communities.name, slug: communities.slug })
      .from(communities)
      .where(eq(communities.id, e.communityId))
      .limit(1)

    const payload: AdminEvent = {
      id: e.id,
      community_id: e.communityId,
      community_name: community[0]?.name ?? "",
      community_slug: community[0]?.slug ?? "",
      title: e.title,
      description: e.description,
      location: e.location,
      start_time: e.startTime.toISOString(),
      end_time: e.endTime.toISOString(),
      created_by: e.createdBy,
      attendee_count: 0,
      created_at: e.createdAt.toISOString(),
    }
    return NextResponse.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
