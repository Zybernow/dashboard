import { type NextRequest } from "next/server"
import { requireSection, runZyber } from "@/lib/api-route"
import { zyberGet } from "@/lib/zyber-api"
import type { LiveUsersPage } from "@/lib/zyber-types"

// Live presence lives in Redis (the `online_users` ZSET), which is only
// reachable from inside the GCP VPC. The Go server runs in-VPC and already
// exposes it enriched + paginated, so we proxy rather than hit Redis from
// Vercel (which can't route to the private Memorystore IP).
export async function GET(req: NextRequest) {
  const auth = await requireSection("live")
  if (auth.error) return auth.error

  const params = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10))
  const limit = Math.min(
    200,
    Math.max(1, parseInt(params.get("limit") ?? "50", 10)),
  )

  return runZyber(() =>
    zyberGet<LiveUsersPage>("/admin/users/live", { page, limit }),
  )
}
