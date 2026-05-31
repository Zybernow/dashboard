import { type NextRequest } from "next/server"
import { requireSection, runZyber } from "@/lib/api-route"
import { zyberGet, zyberPost } from "@/lib/zyber-api"
import type { LogResponse } from "@/lib/zyber-types"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const auth = await requireSection("logs")
  if (auth.error) return auth.error
  const { type } = await params
  return runZyber(() =>
    zyberGet<LogResponse>(`/admin/logs/${encodeURIComponent(type)}`, { limit: 500 }),
  )
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const auth = await requireSection("logs")
  if (auth.error) return auth.error
  const { type } = await params
  return runZyber(() =>
    zyberPost<unknown>(`/admin/logs/${encodeURIComponent(type)}/clear`),
  )
}
