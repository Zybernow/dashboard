import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { invitation } from "@/db/schema"

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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params

  const [updated] = await db
    .update(invitation)
    .set({ status: "revoked" })
    .where(eq(invitation.id, id))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  return NextResponse.json({ invitation: updated })
}
