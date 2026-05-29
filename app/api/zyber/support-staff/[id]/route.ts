import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"
import { supportStaff } from "@/db/prod/schema"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSection("support-staff")
  if (auth.error) return auth.error

  const { id } = await params
  const staffId = Number(id)
  if (!Number.isFinite(staffId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }

  const body = (await req.json().catch(() => null)) as {
    display_name?: string
    is_active?: boolean
  } | null

  const patch: { displayName?: string; isActive?: boolean; updatedAt: Date } = {
    updatedAt: new Date(),
  }
  if (body?.display_name !== undefined) patch.displayName = body.display_name.trim()
  if (body?.is_active !== undefined) patch.isActive = body.is_active

  try {
    const updated = await dbProd
      .update(supportStaff)
      .set(patch)
      .where(eq(supportStaff.id, staffId))
      .returning()

    if (updated.length === 0) {
      return NextResponse.json({ error: "support staff not found" }, { status: 404 })
    }
    const r = updated[0]
    return NextResponse.json({
      id: r.id,
      username: r.username,
      display_name: r.displayName,
      is_active: r.isActive,
      created_by: r.createdBy,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSection("support-staff")
  if (auth.error) return auth.error

  const { id } = await params
  const staffId = Number(id)
  if (!Number.isFinite(staffId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }

  try {
    const deleted = await dbProd
      .delete(supportStaff)
      .where(eq(supportStaff.id, staffId))
      .returning({ id: supportStaff.id })

    if (deleted.length === 0) {
      return NextResponse.json({ error: "support staff not found" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
