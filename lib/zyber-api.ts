import "server-only"

const BASE_URL = (process.env.ZYBER_API_URL ?? "http://localhost:8080").replace(/\/$/, "")
const ADMIN_USERNAME = process.env.ZYBER_ADMIN_USERNAME ?? ""
const ADMIN_PASSWORD = process.env.ZYBER_ADMIN_PASSWORD ?? ""

type TokenCache = {
  token: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null
let inFlightLogin: Promise<string> | null = null

export class ZyberApiError extends Error {
  status: number
  payload: unknown

  constructor(status: number, message: string, payload: unknown) {
    super(message)
    this.name = "ZyberApiError"
    this.status = status
    this.payload = payload
  }
}

async function loginAdmin(): Promise<string> {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    throw new ZyberApiError(
      500,
      "ZYBER_ADMIN_USERNAME and ZYBER_ADMIN_PASSWORD must be set",
      null,
    )
  }

  const res = await fetch(`${BASE_URL}/api/version/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
    cache: "no-store",
  })

  const body = (await res.json().catch(() => null)) as
    | { token?: string; expires_in?: number; error?: string }
    | null

  if (!res.ok || !body?.token) {
    throw new ZyberApiError(
      res.status,
      body?.error ?? "admin login failed",
      body,
    )
  }

  const expiresInSec = body.expires_in ?? 4 * 60 * 60
  tokenCache = {
    token: body.token,
    expiresAt: Date.now() + (expiresInSec - 60) * 1000,
  }
  return body.token
}

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token
  }
  if (inFlightLogin) return inFlightLogin
  inFlightLogin = loginAdmin().finally(() => {
    inFlightLogin = null
  })
  return inFlightLogin
}

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const url = new URL(`${BASE_URL}/api/version${path.startsWith("/") ? path : `/${path}`}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

type RequestOptions = {
  query?: Record<string, unknown>
  body?: unknown
  signal?: AbortSignal
}

async function request<T>(
  method: string,
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, opts.query)
  const init: RequestInit = {
    method,
    cache: "no-store",
    signal: opts.signal,
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  }

  let res = await fetch(url, init)
  if (res.status === 401) {
    tokenCache = null
    ;(init.headers as Record<string, string>).Authorization =
      `Bearer ${await getToken()}`
    res = await fetch(url, init)
  }

  const text = await res.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : null) ?? `Zyber API ${method} ${path} failed (${res.status})`
    throw new ZyberApiError(res.status, message, payload)
  }

  return payload as T
}

export function zyberGet<T>(path: string, query?: Record<string, unknown>) {
  return request<T>("GET", path, { query })
}

export function zyberPost<T>(path: string, body?: unknown, query?: Record<string, unknown>) {
  return request<T>("POST", path, { body: body ?? {}, query })
}

export function zyberPut<T>(path: string, body?: unknown, query?: Record<string, unknown>) {
  return request<T>("PUT", path, { body: body ?? {}, query })
}

export function zyberDelete<T>(path: string, query?: Record<string, unknown>) {
  return request<T>("DELETE", path, { query })
}

// Variant that uses a caller-supplied token (e.g. a maintainer's own JWT)
// instead of the cached super-admin token.
export async function zyberPostWithToken<T>(
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const url = buildUrl(path)
  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  })

  const text = await res.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : null) ?? `Zyber API POST ${path} failed (${res.status})`
    throw new ZyberApiError(res.status, message, payload)
  }

  return payload as T
}
