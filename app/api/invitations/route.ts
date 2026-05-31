import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { and, eq, gt } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { invitation } from "@/db/schema"
import { ROLES } from "@/lib/permissions"
import { sendInvitationEmail } from "@/lib/mailer"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

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

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const obj = (body ?? {}) as { email?: unknown; role?: unknown }
  const email = obj.email
  const role = obj.role ?? "user"

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 })
  }
  if (typeof role !== "string" || !ROLES.includes(role as never)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 })
  }

  const normalized = email.toLowerCase()

  const existing = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(
      and(
        eq(invitation.email, normalized),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date()),
      ),
    )
    .limit(1)

  if (existing.length > 0) {
    return NextResponse.json({ error: "already_invited" }, { status: 409 })
  }

  const id = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

  const [created] = await db
    .insert(invitation)
    .values({
      id,
      email: normalized,
      role: role as (typeof ROLES)[number],
      status: "pending",
      invitedBy: guard.session.user.id,
      expiresAt,
    })
    .returning()

  let emailSent = false
  let emailError: string | undefined
  try {
    await sendInvitationEmail({ email: normalized, role: created.role })
    emailSent = true
  } catch (err) {
    emailError = err instanceof Error ? err.message : "email_failed"
  }

  return NextResponse.json(
    { invitation: created, emailSent, emailError },
    { status: 201 },
  )
}
