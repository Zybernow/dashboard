import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"
import {
  allowedWorkEmailDomains,
  users,
  workEmailReviewRequests,
} from "@/db/prod/schema"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const auth = await requireSection("work-email")
  if (auth.error) return auth.error
  const { id, action } = await params
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "invalid action" }, { status: 400 })
  }

  const reviewId = Number(id)
  if (!Number.isFinite(reviewId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }

  const body = (await req.json().catch(() => ({}))) as { note?: string } | null
  const reviewNote = body?.note ?? ""

  const reviewedBy =
    auth.role === "maintainer"
      ? auth.maintainer.username
      : (auth.session?.user?.email ?? auth.session?.user?.name ?? "admin")

  try {
    // Fetch the review request
    const [review] = await dbProd
      .select()
      .from(workEmailReviewRequests)
      .where(eq(workEmailReviewRequests.id, reviewId))

    if (!review) {
      return NextResponse.json({ error: "review not found" }, { status: 404 })
    }
    if (review.status !== "pending") {
      return NextResponse.json({ error: "review already processed" }, { status: 409 })
    }

    // Maintainer scope check: only act on reviews from users in their colleges
    if (auth.role === "maintainer" && auth.maintainer.colleges.length > 0) {
      const [user] = await dbProd
        .select({ college: users.college })
        .from(users)
        .where(eq(users.username, review.username))
      if (!user || !auth.maintainer.colleges.includes(user.college)) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 })
      }
    }

    const now = new Date()

    if (action === "approve") {
      await dbProd.transaction(async (tx) => {
        await tx
          .update(workEmailReviewRequests)
          .set({
            status: "approved",
            reviewedBy,
            reviewedAt: now,
            reviewNote,
          })
          .where(eq(workEmailReviewRequests.id, reviewId))

        await tx
          .update(users)
          .set({ workEmailVerified: true, updatedAt: now })
          .where(eq(users.username, review.username))

        await tx
          .insert(allowedWorkEmailDomains)
          .values({ domain: review.domain, createdAt: now })
          .onConflictDoNothing({ target: allowedWorkEmailDomains.domain })
      })
    } else {
      await dbProd
        .update(workEmailReviewRequests)
        .set({
          status: "rejected",
          reviewedBy,
          reviewedAt: now,
          reviewNote,
        })
        .where(eq(workEmailReviewRequests.id, reviewId))
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
