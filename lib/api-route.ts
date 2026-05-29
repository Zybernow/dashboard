import "server-only"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { canAccess, type DashboardSection, type Role } from "@/lib/permissions"
import { getMaintainerSession, type MaintainerSession } from "@/lib/maintainer-session"
import { ZyberApiError } from "@/lib/zyber-api"

type RequireSectionResult =
  | {
      error: NextResponse
      session?: undefined
      role?: undefined
      maintainer?: undefined
    }
  | {
      error?: undefined
      session: Awaited<ReturnType<typeof auth.api.getSession>>
      role: Role | undefined
      maintainer?: undefined
    }
  | {
      error?: undefined
      session?: undefined
      role: "maintainer"
      maintainer: MaintainerSession
    }

export async function requireSection(
  section: DashboardSection,
): Promise<RequireSectionResult> {
  // Run both auth checks in parallel to reduce per-request latency.
  const [session, maintainer] = await Promise.all([
    auth.api.getSession({ headers: await headers() }).catch(() => null),
    getMaintainerSession().catch(() => null),
  ])

  if (session) {
    const role = session.user.role as Role | undefined
    if (!canAccess(role, section)) {
      return {
        error: NextResponse.json({ error: "forbidden" }, { status: 403 }),
      }
    }
    return { session, role }
  }

  if (maintainer) {
    if (!canAccess(maintainer.role, section)) {
      return {
        error: NextResponse.json({ error: "forbidden" }, { status: 403 }),
      }
    }
    return { role: "maintainer", maintainer }
  }

  return {
    error: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
  }
}

export async function runZyber<T>(
  fn: () => Promise<T>,
): Promise<NextResponse> {
  try {
    const data = await fn()
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof ZyberApiError) {
      return NextResponse.json(
        { error: err.message, payload: err.payload },
        { status: err.status },
      )
    }
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
