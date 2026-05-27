import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireSection, runZyber } from "@/lib/api-route"
import { zyberPost, zyberPostWithToken } from "@/lib/zyber-api"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const auth = await requireSection("work-email")
  if (auth.error) return auth.error
  const { id, action } = await params
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "invalid action" }, { status: 400 })
  }
  const body = (await req.json().catch(() => ({}))) as
    | { note?: string }
    | null

  const path = `/admin/work-email-reviews/${encodeURIComponent(id)}/${action}`
  const payload = { note: body?.note ?? "" }

  // For maintainers, forward their own JWT so the Go backend can record
  // the reviewer identity correctly (it uses the token's username claim).
  if (auth.role === "maintainer") {
    const cookieStore = await cookies()
    const maintainerToken = cookieStore.get("maintainer_token")?.value
    if (!maintainerToken) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
    return runZyber(() => zyberPostWithToken<unknown>(path, maintainerToken, payload))
  }

  return runZyber(() => zyberPost<unknown>(path, payload))
}
