import { NextResponse } from "next/server"
import { and, asc, eq, inArray } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"
import { users, workEmailReviewRequests } from "@/db/prod/schema"
import type { WorkEmailReviewRequest } from "@/lib/zyber-types"

export async function GET() {
  const auth = await requireSection("work-email")
  if (auth.error) return auth.error

  // Maintainers only see reviews from users at their assigned colleges.
  const collegeFilter =
    auth.role === "maintainer" && auth.maintainer.colleges.length > 0
      ? auth.maintainer.colleges
      : null

  try {
    const baseConditions = [eq(workEmailReviewRequests.status, "pending")]

    // When filtering by colleges, we need to join and constrain the college field
    let rows
    if (collegeFilter) {
      rows = await dbProd
        .select({
          id: workEmailReviewRequests.id,
          username: workEmailReviewRequests.username,
          workEmail: workEmailReviewRequests.workEmail,
          domain: workEmailReviewRequests.domain,
          status: workEmailReviewRequests.status,
          reviewedBy: workEmailReviewRequests.reviewedBy,
          reviewedAt: workEmailReviewRequests.reviewedAt,
          createdAt: workEmailReviewRequests.createdAt,
          userEmail: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          college: users.college,
          collegeCourse: users.collegeCourse,
          graduationYear: users.graduationYear,
          age: users.age,
          gender: users.gender,
          headline: users.headline,
          bio: users.bio,
          linkedinUrl: users.linkedinUrl,
          instagramHandle: users.instagramHandle,
          twitterHandle: users.twitterHandle,
          userIsActive: users.isActive,
          userAccountState: users.accountState,
          userCreatedAt: users.createdAt,
        })
        .from(workEmailReviewRequests)
        .innerJoin(users, eq(users.username, workEmailReviewRequests.username))
        .where(
          and(
            ...baseConditions,
            inArray(users.college, collegeFilter),
          ),
        )
        .orderBy(asc(workEmailReviewRequests.createdAt))
    } else {
      rows = await dbProd
        .select({
          id: workEmailReviewRequests.id,
          username: workEmailReviewRequests.username,
          workEmail: workEmailReviewRequests.workEmail,
          domain: workEmailReviewRequests.domain,
          status: workEmailReviewRequests.status,
          reviewedBy: workEmailReviewRequests.reviewedBy,
          reviewedAt: workEmailReviewRequests.reviewedAt,
          createdAt: workEmailReviewRequests.createdAt,
          userEmail: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          college: users.college,
          collegeCourse: users.collegeCourse,
          graduationYear: users.graduationYear,
          age: users.age,
          gender: users.gender,
          headline: users.headline,
          bio: users.bio,
          linkedinUrl: users.linkedinUrl,
          instagramHandle: users.instagramHandle,
          twitterHandle: users.twitterHandle,
          userIsActive: users.isActive,
          userAccountState: users.accountState,
          userCreatedAt: users.createdAt,
        })
        .from(workEmailReviewRequests)
        .innerJoin(users, eq(users.username, workEmailReviewRequests.username))
        .where(and(...baseConditions))
        .orderBy(asc(workEmailReviewRequests.createdAt))
    }

    const payload: { requests: WorkEmailReviewRequest[] } = {
      requests: rows.map((r) => ({
        id: r.id,
        username: r.username,
        workEmail: r.workEmail,
        domain: r.domain,
        status: r.status,
        reviewedBy: r.reviewedBy,
        reviewedAt: r.reviewedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        user_profile: {
          email: r.userEmail,
          first_name: r.firstName,
          last_name: r.lastName,
          college: r.college,
          college_course: r.collegeCourse,
          graduation_year: r.graduationYear ?? undefined,
          age: r.age,
          gender: r.gender,
          headline: r.headline,
          bio: r.bio,
          linkedin_url: r.linkedinUrl,
          instagram_handle: r.instagramHandle,
          twitter_handle: r.twitterHandle,
          is_active: r.userIsActive,
          account_state: r.userAccountState,
          created_at: r.userCreatedAt.toISOString(),
        },
      })),
    }
    return NextResponse.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
