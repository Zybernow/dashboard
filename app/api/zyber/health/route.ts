import "server-only"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { zyberGet, ZyberApiError } from "@/lib/zyber-api"

export async function GET() {
  const session = await getSession()
  if (!session || (session.user.role as string) !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const configuredUrl = process.env.ZYBER_API_URL ?? "(not set — defaulting to http://localhost:8080)"
  const hasUsername = !!process.env.ZYBER_ADMIN_USERNAME
  const hasPassword = !!process.env.ZYBER_ADMIN_PASSWORD

  try {
    const data = await zyberGet<{ username: string; role: string }>("/admin/me")
    return NextResponse.json({
      ok: true,
      url: configuredUrl,
      credentials_set: { username: hasUsername, password: hasPassword },
      authenticated_as: data,
    })
  } catch (err) {
    const isZyberError = err instanceof ZyberApiError
    return NextResponse.json(
      {
        ok: false,
        url: configuredUrl,
        credentials_set: { username: hasUsername, password: hasPassword },
        error: err instanceof Error ? err.message : String(err),
        status: isZyberError ? (err as ZyberApiError).status : null,
        payload: isZyberError ? (err as ZyberApiError).payload : null,
      },
      { status: 502 },
    )
  }
}
