import { type NextRequest } from "next/server"
import { requireSection, runZyber } from "@/lib/api-route"
import { zyberGet, zyberPost } from "@/lib/zyber-api"

export async function GET(req: NextRequest) {
  const auth = await requireSection("notifications")
  if (auth.error) return auth.error

  const limit = req.nextUrl.searchParams.get("limit") ?? "50"
  return runZyber(() =>
    zyberGet<unknown>("/admin/notifications/campaigns", { limit }),
  )
}

export async function POST(req: NextRequest) {
  const auth = await requireSection("notifications")
  if (auth.error) return auth.error

  const body = await req.json().catch(() => ({}))
  return runZyber(() => zyberPost<unknown>("/admin/notifications/campaigns", body))
}
