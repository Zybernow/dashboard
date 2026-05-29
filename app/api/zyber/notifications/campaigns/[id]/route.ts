import { type NextRequest } from "next/server"
import { requireSection, runZyber } from "@/lib/api-route"
import { zyberGet, zyberPost } from "@/lib/zyber-api"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSection("notifications")
  if (auth.error) return auth.error

  const { id } = await params
  return runZyber(() =>
    zyberGet<unknown>(`/admin/notifications/campaigns/${encodeURIComponent(id)}`),
  )
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSection("notifications")
  if (auth.error) return auth.error

  const { id } = await params
  return runZyber(() =>
    zyberPost<unknown>(
      `/admin/notifications/campaigns/${encodeURIComponent(id)}/cancel`,
    ),
  )
}
