import { type NextRequest, NextResponse } from "next/server"
import { desc } from "drizzle-orm"
import { requireSection, runZyber } from "@/lib/api-route"
import { zyberPost } from "@/lib/zyber-api"
import { dbProd } from "@/db/prod/drizzle"
import { supportStaff } from "@/db/prod/schema"

export async function GET() {
  const auth = await requireSection("support-staff")
  if (auth.error) return auth.error

  try {
    const rows = await dbProd
      .select({
        id: supportStaff.id,
        username: supportStaff.username,
        display_name: supportStaff.displayName,
        is_active: supportStaff.isActive,
        created_by: supportStaff.createdBy,
        created_at: supportStaff.createdAt,
        updated_at: supportStaff.updatedAt,
      })
      .from(supportStaff)
      .orderBy(desc(supportStaff.createdAt))

    return NextResponse.json({
      support_staff: rows.map((r) => ({
        id: r.id,
        username: r.username,
        display_name: r.display_name,
        is_active: r.is_active,
        created_by: r.created_by,
        created_at: r.created_at.toISOString(),
        updated_at: r.updated_at.toISOString(),
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST stays proxied: support staff creation generates a random password
// and bcrypt-hashes it on the Go server.
export async function POST(req: NextRequest) {
  const auth = await requireSection("support-staff")
  if (auth.error) return auth.error

  const body = (await req.json().catch(() => null)) as {
    username?: string
    display_name?: string
  } | null

  if (!body?.username?.trim()) {
    return NextResponse.json({ error: "username is required" }, { status: 400 })
  }

  return runZyber(() =>
    zyberPost<{ support_staff: unknown; generated_password: string }>(
      "/admin/support-staff",
      body,
    ),
  )
}
