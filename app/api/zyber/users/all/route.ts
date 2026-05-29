import { type NextRequest, NextResponse } from "next/server"
import { ne } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"
import { users } from "@/db/prod/schema"

export async function POST(req: NextRequest) {
  const auth = await requireSection("users")
  if (auth.error) return auth.error

  const body = (await req.json().catch(() => null)) as {
    action?: "disable" | "enable"
  } | null

  if (!body?.action || (body.action !== "disable" && body.action !== "enable")) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 })
  }

  const isActive = body.action === "enable"

  try {
    const updated = await dbProd
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(ne(users.role, "admin"))
      .returning({ username: users.username })

    return NextResponse.json({ updated_count: updated.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
