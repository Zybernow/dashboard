import { type NextRequest, NextResponse } from "next/server"
import { inArray } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"
import { users } from "@/db/prod/schema"

export async function POST(req: NextRequest) {
  const auth = await requireSection("users")
  if (auth.error) return auth.error

  const body = (await req.json().catch(() => null)) as {
    action?: "disable" | "enable"
    emails?: string
  } | null

  if (!body?.action || (body.action !== "disable" && body.action !== "enable")) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 })
  }
  if (!body.emails) {
    return NextResponse.json({ error: "emails is required" }, { status: 400 })
  }

  const emailList = body.emails
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (emailList.length === 0) {
    return NextResponse.json({ error: "no valid emails provided" }, { status: 400 })
  }

  const isActive = body.action === "enable"

  try {
    const updated = await dbProd
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(inArray(users.email, emailList))
      .returning({ username: users.username })

    return NextResponse.json({ updated_count: updated.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
