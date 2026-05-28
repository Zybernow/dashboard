import { type NextRequest, NextResponse } from "next/server"
import { requireSection, runZyber } from "@/lib/api-route"
import { zyberPost } from "@/lib/zyber-api"

const ACTIONS = {
  disable: "/users/disable",
  enable: "/users/enable",
  delete: "/users/delete",
  ban: "/users/ban",
  unban: "/users/unban",
} as const

type Action = keyof typeof ACTIONS

export async function POST(req: NextRequest) {
  const auth = await requireSection("users")
  if (auth.error) return auth.error

  const body = (await req.json().catch(() => null)) as {
    action?: Action
    email?: string
  } | null

  if (!body?.action || !(body.action in ACTIONS)) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 })
  }
  if (!body.email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 })
  }

  const path = ACTIONS[body.action]
  return runZyber(() => zyberPost<unknown>(path, { email: body.email }))
}
