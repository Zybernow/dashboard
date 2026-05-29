import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { requireSection, runZyber } from "@/lib/api-route"
import { zyberPost } from "@/lib/zyber-api"
import { dbProd } from "@/db/prod/drizzle"
import { users } from "@/db/prod/schema"

const DIRECT_ACTIONS = {
  disable: { isActive: false },
  enable: { isActive: true },
  ban: { isBanned: true },
  unban: { isBanned: false },
} as const

type DirectAction = keyof typeof DIRECT_ACTIONS
type Action = DirectAction | "delete"

export async function POST(req: NextRequest) {
  const auth = await requireSection("users")
  if (auth.error) return auth.error

  const body = (await req.json().catch(() => null)) as {
    action?: Action
    email?: string
  } | null

  if (!body?.action || !["disable", "enable", "delete", "ban", "unban"].includes(body.action)) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 })
  }
  if (!body.email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 })
  }

  // Delete cascades many tables — keep proxied to Go backend.
  if (body.action === "delete") {
    return runZyber(() => zyberPost<unknown>("/users/delete", { email: body.email }))
  }

  const patch = DIRECT_ACTIONS[body.action as DirectAction]

  try {
    const updated = await dbProd
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.email, body.email))
      .returning({ username: users.username })

    if (updated.length === 0) {
      return NextResponse.json({ error: "user not found" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
