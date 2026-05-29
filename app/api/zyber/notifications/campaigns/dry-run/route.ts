import { type NextRequest } from "next/server"
import { requireSection, runZyber } from "@/lib/api-route"
import { zyberPost } from "@/lib/zyber-api"

export async function POST(req: NextRequest) {
  const auth = await requireSection("notifications")
  if (auth.error) return auth.error

  const body = await req.json().catch(() => ({}))
  return runZyber(() =>
    zyberPost<unknown>("/admin/notifications/campaigns/dry-run", body),
  )
}
