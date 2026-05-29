import { type NextRequest, NextResponse } from "next/server"
import { desc } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"
import { announcements } from "@/db/prod/schema"

export async function GET() {
  const auth = await requireSection("announcements")
  if (auth.error) return auth.error

  try {
    const rows = await dbProd
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt))

    return NextResponse.json({
      announcements: rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        image_url: r.imageUrl,
        button_text: r.buttonText,
        button_action: r.buttonAction,
        is_active: r.isActive,
        start_at: r.startAt?.toISOString() ?? null,
        end_at: r.endAt?.toISOString() ?? null,
        price_inr: r.priceInr,
        created_at: r.createdAt.toISOString(),
        updated_at: r.updatedAt.toISOString(),
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSection("announcements")
  if (auth.error) return auth.error

  const body = (await req.json().catch(() => null)) as {
    title?: string
    body?: string
    image_url?: string
    button_text?: string
    button_action?: string
    is_active?: boolean
    start_at?: string | null
    end_at?: string | null
    price_inr?: number
  } | null

  if (!body?.title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  const now = new Date()
  try {
    const [inserted] = await dbProd
      .insert(announcements)
      .values({
        title: body.title.trim(),
        body: body.body?.trim() ?? "",
        imageUrl: body.image_url?.trim() ?? "",
        buttonText: body.button_text?.trim() ?? "",
        buttonAction: body.button_action?.trim() ?? "",
        isActive: body.is_active ?? false,
        startAt: body.start_at ? new Date(body.start_at) : null,
        endAt: body.end_at ? new Date(body.end_at) : null,
        priceInr: body.price_inr ?? 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return NextResponse.json({
      id: inserted.id,
      title: inserted.title,
      body: inserted.body,
      image_url: inserted.imageUrl,
      button_text: inserted.buttonText,
      button_action: inserted.buttonAction,
      is_active: inserted.isActive,
      start_at: inserted.startAt?.toISOString() ?? null,
      end_at: inserted.endAt?.toISOString() ?? null,
      price_inr: inserted.priceInr,
      created_at: inserted.createdAt.toISOString(),
      updated_at: inserted.updatedAt.toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
