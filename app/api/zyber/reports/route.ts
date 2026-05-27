import { type NextRequest, NextResponse } from "next/server"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"
import { userReports, users } from "@/db/prod/schema"
import type { UserReportsPage } from "@/lib/zyber-types"

export async function GET(req: NextRequest) {
  const auth = await requireSection("reports")
  if (auth.error) return auth.error

  // Maintainers only see reports where the reported user is from their colleges.
  const maintainerColleges =
    auth.role === "maintainer" && auth.maintainer.colleges.length > 0
      ? auth.maintainer.colleges
      : null

  const params = req.nextUrl.searchParams
  const status = params.get("status")?.trim() ?? ""
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(params.get("limit") ?? "20", 10) || 20),
  )
  const offset = Math.max(0, Number.parseInt(params.get("offset") ?? "0", 10) || 0)

  try {
    let rows, totalRow

    if (maintainerColleges) {
      // Join with users to filter by reported user's college
      const reportedUser = users
      const conditions = []
      if (status) conditions.push(eq(userReports.status, status))
      conditions.push(inArray(reportedUser.college, maintainerColleges))
      const whereClause = and(...conditions)

      ;[rows, totalRow] = await Promise.all([
        dbProd
          .select({
            id: userReports.id,
            reporterUsername: userReports.reporterUsername,
            reportedUsername: userReports.reportedUsername,
            reason: userReports.reason,
            notes: userReports.notes,
            status: userReports.status,
            adminNotes: userReports.adminNotes,
            createdAt: userReports.createdAt,
            updatedAt: userReports.updatedAt,
          })
          .from(userReports)
          .innerJoin(
            reportedUser,
            eq(reportedUser.username, userReports.reportedUsername),
          )
          .where(whereClause)
          .orderBy(desc(userReports.createdAt))
          .limit(limit)
          .offset(offset),
        dbProd
          .select({ count: sql<number>`count(*)::int` })
          .from(userReports)
          .innerJoin(
            reportedUser,
            eq(reportedUser.username, userReports.reportedUsername),
          )
          .where(whereClause),
      ])
    } else {
      const whereClause = status ? eq(userReports.status, status) : undefined
      ;[rows, totalRow] = await Promise.all([
        dbProd
          .select()
          .from(userReports)
          .where(whereClause)
          .orderBy(desc(userReports.createdAt))
          .limit(limit)
          .offset(offset),
        dbProd
          .select({ count: sql<number>`count(*)::int` })
          .from(userReports)
          .where(whereClause),
      ])
    }

    const payload: UserReportsPage = {
      reports: rows.map((r) => ({
        id: r.id,
        reporterUsername: r.reporterUsername,
        reportedUsername: r.reportedUsername,
        reason: r.reason,
        notes: r.notes,
        status: r.status,
        adminNotes: r.adminNotes,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total: totalRow[0]?.count ?? 0,
      limit,
      offset,
    }
    return NextResponse.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
