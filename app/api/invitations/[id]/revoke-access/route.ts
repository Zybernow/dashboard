import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { invitation } from "@/db/schema"
import { zyberPost, ZyberApiError } from "@/lib/zyber-api"

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

export async function POST(
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

  if (inv.status !== "accepted") {
    return NextResponse.json({ error: "invitation_not_accepted" }, { status: 400 })
  }

  try {
    await zyberPost("/users/disable", { email: inv.email })
  } catch (err) {
    if (!(err instanceof ZyberApiError && err.status === 404)) {
      const message = err instanceof ZyberApiError ? err.message : "internal error"
      return NextResponse.json({ error: message }, { status: 500 })
    }
    // User not found — still mark the invitation revoked
  }

  const [updated] = await db
    .update(invitation)
    .set({ status: "revoked" })
    .where(eq(invitation.id, id))
    .returning()

  return NextResponse.json({ invitation: updated })
}
