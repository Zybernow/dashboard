import { type NextRequest, NextResponse } from "next/server"
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"
import { users, userReferralSources } from "@/db/prod/schema"
import type { AdminUser, AdminUsersPage } from "@/lib/zyber-types"

const SORT_COLUMNS = {
  created_at: users.createdAt,
  username: users.username,
  email: users.email,
  first_name: users.firstName,
} as const

export async function GET(req: NextRequest) {
  const auth = await requireSection("users")
  if (auth.error) return auth.error

  // Maintainers can only see users from their assigned colleges.
  const maintainerColleges =
    auth.role === "maintainer" && auth.maintainer.colleges.length > 0
      ? auth.maintainer.colleges
      : null

  const params = req.nextUrl.searchParams
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1)
  const limit = Math.min(
    10000,
    Math.max(1, Number.parseInt(params.get("limit") ?? "50", 10) || 50),
  )
  const search = params.get("search")?.trim() ?? ""
  const active = params.get("active")
  const disabled = params.get("disabled")
  const college = params.get("college")?.trim() ?? ""
  const workEmail = params.get("work_email")
  const onboarding = params.get("onboarding")
  const sort = params.get("sort") ?? "created_at"
  const order = params.get("order") ?? "desc"

  const conditions = []
  if (search) {
    const pat = `%${search}%`
    conditions.push(
      or(
        ilike(users.username, pat),
        ilike(users.email, pat),
        ilike(users.firstName, pat),
        ilike(users.lastName, pat),
      ),
    )
  }
  if (active === "yes") conditions.push(eq(users.isActive, true))
  if (active === "no") conditions.push(eq(users.isActive, false))
  if (disabled === "yes") conditions.push(eq(users.isBanned, true))
  if (disabled === "no") conditions.push(eq(users.isBanned, false))
  if (college) {
    conditions.push(
      sql`lower(trim(${users.college})) = lower(${college})`,
    )
  }
  if (workEmail === "yes") {
    conditions.push(eq(users.workEmailVerified, true))
    conditions.push(sql`${users.workEmail} <> ''`)
  }
  if (workEmail === "no") {
    conditions.push(eq(users.workEmailVerified, false))
  }
  if (onboarding === "yes") conditions.push(eq(users.isOnboardingComplete, true))
  if (onboarding === "no") conditions.push(eq(users.isOnboardingComplete, false))

  // Lock maintainer views to their assigned colleges
  if (maintainerColleges) {
    conditions.push(inArray(users.college, maintainerColleges))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const sortCol =
    SORT_COLUMNS[sort as keyof typeof SORT_COLUMNS] ?? users.createdAt
  const orderFn = order === "asc" ? asc : desc

  try {
    const [rows, totalRow] = await Promise.all([
      dbProd
        .select({
          username: users.username,
          email: users.email,
          first_name: users.firstName,
          last_name: users.lastName,
          is_active: users.isActive,
          is_banned: users.isBanned,
          created_at: users.createdAt,
          phone_number: users.phoneNumber,
          phone_verified: users.phoneVerified,
          work_email: users.workEmail,
          work_email_verified: users.workEmailVerified,
          college: users.college,
          college_course: users.collegeCourse,
          graduation_year: users.graduationYear,
          age: users.age,
          gender: users.gender,
          headline: users.headline,
          bio: users.bio,
          is_onboarding_complete: users.isOnboardingComplete,
          account_state: users.accountState,
          last_login_at: users.lastLoginAt,
          linkedin_url: users.linkedinUrl,
          instagram_handle: users.instagramHandle,
          twitter_handle: users.twitterHandle,
          role: users.role,
          referral_source: sql<string>`coalesce(${userReferralSources.source}, '')`,
          referral_ref_by: sql<string>`coalesce(${userReferralSources.refereeUsername}, '')`,
        })
        .from(users)
        .leftJoin(
          userReferralSources,
          eq(userReferralSources.username, users.username),
        )
        .where(whereClause)
        .orderBy(orderFn(sortCol))
        .limit(limit)
        .offset((page - 1) * limit),
      dbProd
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(whereClause),
    ])

    const total = totalRow[0]?.count ?? 0
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0

    const payload: AdminUsersPage = {
      users: rows.map(serializeUser),
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

function serializeUser(row: {
  username: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  is_banned: boolean
  created_at: Date
  phone_number: string
  phone_verified: boolean
  work_email: string
  work_email_verified: boolean
  college: string
  college_course: string
  graduation_year: number | null
  age: number
  gender: string
  headline: string
  bio: string
  is_onboarding_complete: boolean
  account_state: string
  last_login_at: Date | null
  linkedin_url: string
  instagram_handle: string
  twitter_handle: string
  role: string
  referral_source: string
  referral_ref_by: string
}): AdminUser {
  return {
    username: row.username,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    is_active: row.is_active,
    is_banned: row.is_banned,
    created_at: row.created_at.toISOString(),
    phone_number: row.phone_number,
    phone_verified: row.phone_verified,
    work_email: row.work_email,
    work_email_verified: row.work_email_verified,
    college: row.college,
    college_course: row.college_course,
    graduation_year: row.graduation_year ?? undefined,
    age: row.age,
    gender: row.gender,
    headline: row.headline,
    bio: row.bio,
    is_onboarding_complete: row.is_onboarding_complete,
    account_state: row.account_state,
    last_login_at: row.last_login_at?.toISOString(),
    linkedin_url: row.linkedin_url,
    instagram_handle: row.instagram_handle,
    twitter_handle: row.twitter_handle,
    role: row.role,
    referral_source: row.referral_source,
    referral_ref_by: row.referral_ref_by,
  }
}
