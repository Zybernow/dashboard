import { type NextRequest, NextResponse } from "next/server"

const BASE_URL = (process.env.ZYBER_API_URL ?? "http://localhost:8080").replace(
  /\/$/,
  "",
)

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    username?: string
    password?: string
  } | null

  if (!body?.username || !body.password) {
    return NextResponse.json(
      { error: "username and password are required" },
      { status: 400 },
    )
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}/api/version/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: body.username,
        password: body.password,
      }),
      cache: "no-store",
    })
  } catch {
    return NextResponse.json(
      { error: "could not reach authentication server" },
      { status: 502 },
    )
  }

  const data = (await res.json().catch(() => null)) as {
    token?: string
    expires_in?: number
    role?: string
    username?: string
    error?: string
  } | null

  if (!res.ok || !data?.token || data.role !== "maintainer") {
    return NextResponse.json(
      { error: data?.error ?? "invalid credentials" },
      { status: 401 },
    )
  }

  const expiresInSec = data.expires_in ?? 4 * 60 * 60
  const response = NextResponse.json({
    username: data.username ?? body.username,
    role: "maintainer",
  })
  response.cookies.set("maintainer_token", data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiresInSec,
  })
  return response
}
