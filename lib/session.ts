import "server-only"
import { cache } from "react"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

// React.cache deduplicates calls within a single server render pass.
// Both the (app)/layout.tsx and individual page.tsx call getSession on each
// navigation — without this, that means 2+ separate DB round-trips per click.
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() }).catch(() => null)
})
