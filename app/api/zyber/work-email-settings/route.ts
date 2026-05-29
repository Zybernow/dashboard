import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"
import { appVersionConfig } from "@/db/prod/schema"

export async function GET() {
  const auth = await requireSection("work-email")
  if (auth.error) return auth.error

  try {
    const [row] = await dbProd
      .select({ workEmailOpen: appVersionConfig.workEmailOpen })
      .from(appVersionConfig)
      .where(eq(appVersionConfig.id, 1))

    return NextResponse.json({ open: row?.workEmailOpen ?? false })
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireSection("work-email")
  if (auth.error) return auth.error

  if (auth.role === "maintainer") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as { open?: boolean } | null
  if (typeof body?.open !== "boolean") {
    return NextResponse.json({ error: "open (boolean) is required" }, { status: 400 })
  }

  try {
    await dbProd
      .update(appVersionConfig)
      .set({ workEmailOpen: body.open, updatedAt: new Date() })
      .where(eq(appVersionConfig.id, 1))

    return NextResponse.json({ open: body.open })
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
