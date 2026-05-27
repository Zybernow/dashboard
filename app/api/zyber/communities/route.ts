import { type NextRequest, NextResponse } from "next/server"
import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"
import { communities, communityMembers, users } from "@/db/prod/schema"
import type { AdminCommunitiesPage, AdminCommunity } from "@/lib/zyber-types"

const SORT_COLUMNS = {
  created_at: communities.createdAt,
  name: communities.name,
  type: communities.type,
  is_private: communities.isPrivate,
} as const

export async function GET(req: NextRequest) {
  const auth = await requireSection("communities")
  if (auth.error) return auth.error

  // Maintainers only see communities created by users from their colleges.
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
  const sort = params.get("sort") ?? "created_at"
  const order = params.get("order") ?? "desc"

  const memberCount = sql<number>`(select count(*)::int from ${communityMembers} where ${communityMembers.communityId} = ${communities.id})`

  const conditions = [ne(communities.status, "pending")]
  if (search) {
    const pat = `%${search}%`
    conditions.push(
      or(
        ilike(communities.name, pat),
        ilike(communities.slug, pat),
        ilike(communities.createdBy, pat),
      )!,
    )
  }

  // For maintainers: only communities whose creator belongs to their colleges.
  // We use a subquery via inArray with usernames from those colleges.
  let creatorFilter: string[] | null = null
  if (maintainerColleges) {
    const creatorRows = await dbProd
      .select({ username: users.username })
      .from(users)
      .where(inArray(users.college, maintainerColleges))
    creatorFilter = creatorRows.map((r) => r.username)
    if (creatorFilter.length > 0) {
      conditions.push(inArray(communities.createdBy, creatorFilter))
    } else {
      // No users in these colleges → no communities to show
      return NextResponse.json({
        communities: [],
        total: 0,
        page: 1,
        limit: 50,
        total_pages: 0,
      } satisfies AdminCommunitiesPage)
    }
  }

  const whereClause = and(...conditions)

  const orderFn = order === "asc" ? asc : desc
  const orderBy =
    sort === "member_count"
      ? orderFn(memberCount)
      : orderFn(SORT_COLUMNS[sort as keyof typeof SORT_COLUMNS] ?? communities.createdAt)

  try {
    const [rows, totalRow] = await Promise.all([
      dbProd
        .select({
          id: communities.id,
          slug: communities.slug,
          name: communities.name,
          description: communities.description,
          icon: communities.avatarUrl,
          type: communities.type,
          is_private: communities.isPrivate,
          created_by: communities.createdBy,
          member_count: memberCount,
          created_at: communities.createdAt,
        })
        .from(communities)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit),
      dbProd
        .select({ count: sql<number>`count(*)::int` })
        .from(communities)
        .where(whereClause),
    ])

    const total = totalRow[0]?.count ?? 0
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0

    const payload: AdminCommunitiesPage = {
      communities: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description ?? "",
        icon: r.icon ?? "",
        type: r.type,
        is_private: r.is_private,
        created_by: r.created_by,
        member_count: r.member_count,
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
  const auth = await requireSection("communities")
  if (auth.error) return auth.error

  if (auth.role === "maintainer") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as
    | {
        name?: string
        description?: string
        type?: string
        is_private?: boolean
        avatar_url?: string
        created_by?: string
      }
    | null
  if (!body?.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }
  if (!body.created_by) {
    return NextResponse.json(
      { error: "created_by is required" },
      { status: 400 },
    )
  }

  const slug = slugify(body.name)
  if (!slug) {
    return NextResponse.json({ error: "invalid name" }, { status: 400 })
  }

  try {
    const inserted = await dbProd
      .insert(communities)
      .values({
        slug,
        name: body.name,
        description: body.description ?? "",
        avatarUrl: body.avatar_url ?? "",
        type: body.type ?? "social",
        isPrivate: body.is_private ?? false,
        createdBy: body.created_by,
        status: "approved",
        requiresApproval: false,
        inviteToken: "",
        adminOnlyPosts: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({
        id: communities.id,
        slug: communities.slug,
        name: communities.name,
        description: communities.description,
        avatarUrl: communities.avatarUrl,
        type: communities.type,
        isPrivate: communities.isPrivate,
        createdBy: communities.createdBy,
        createdAt: communities.createdAt,
      })

    const c = inserted[0]
    const payload: AdminCommunity = {
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description ?? "",
      icon: c.avatarUrl ?? "",
      type: c.type,
      is_private: c.isPrivate,
      created_by: c.createdBy,
      member_count: 0,
      created_at: c.createdAt.toISOString(),
    }
    return NextResponse.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    if (message.includes("communities_slug_key") || message.includes("duplicate key")) {
      return NextResponse.json(
        { error: "slug already exists" },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
}
