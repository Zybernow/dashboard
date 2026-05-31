import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { eq, or } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { invitation, user } from "@/db/schema"
import { ROLES } from "@/lib/permissions"

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) }
  }
  if (session.user.role !== "admin") {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) }
  }
  return { session }
}

// Change a dashboard user's role. Updates the invitation, and — if the invite
// has already been accepted — the live user record so the change takes effect
// on their next request.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const role = (body as { role?: unknown })?.role
  if (typeof role !== "string" || !ROLES.includes(role as never)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 })
  }

  const [inv] = await db
    .select()
    .from(invitation)
    .where(eq(invitation.id, id))
    .limit(1)

  if (!inv) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const [updated] = await db
    .update(invitation)
    .set({ role: role as (typeof ROLES)[number] })
    .where(eq(invitation.id, id))
    .returning()

  if (inv.status === "accepted") {
    await db
      .update(user)
      .set({ role: role as (typeof ROLES)[number] })
      .where(
        inv.acceptedBy
          ? or(eq(user.id, inv.acceptedBy), eq(user.email, inv.email))
          : eq(user.email, inv.email),
      )
  }

  return NextResponse.json({ invitation: updated })
}

// Revoke dashboard access by completely removing the user from the dashboard
// database. This only touches the dashboard's own auth tables — the main Zyber
// app's user data is never affected.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params

  const [inv] = await db
    .select()
    .from(invitation)
    .where(eq(invitation.id, id))
    .limit(1)

  if (!inv) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  // If the invite was accepted, delete the dashboard user record. The session
  // and account tables cascade on user deletion (see db/schema.ts), so the
  // person is signed out and can no longer re-enter.
  if (inv.status === "accepted") {
    await db
      .delete(user)
      .where(
        inv.acceptedBy
          ? or(eq(user.id, inv.acceptedBy), eq(user.email, inv.email))
          : eq(user.email, inv.email),
      )
  }

  await db.delete(invitation).where(eq(invitation.id, id))

  return NextResponse.json({ ok: true })
}
