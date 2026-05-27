import { type NextRequest, NextResponse } from "next/server"
import { requireSection } from "@/lib/api-route"
import { runReadonlyQuery } from "@/db/prod/readonly"

const MAX_ROWS = 500
const STATEMENT_TIMEOUT_MS = 10_000

export async function POST(req: NextRequest) {
  // ── Auth: admin-only ────────────────────────────────────────────────────────
  const auth = await requireSection("sql-explorer")
  if (auth.error) return auth.error

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).sql !== "string"
  ) {
    return NextResponse.json(
      { error: 'Body must be JSON with a "sql" string field.' },
      { status: 400 },
    )
  }

  const rawSql = ((body as Record<string, unknown>).sql as string).trim()

  if (!rawSql) {
    return NextResponse.json({ error: "SQL query is empty." }, { status: 400 })
  }

  // ── Defence-in-depth: only allow SELECT statements ──────────────────────────
  if (!/^select\b/i.test(rawSql)) {
    return NextResponse.json(
      {
        error:
          "Only SELECT statements are allowed. The connection also enforces a READ ONLY transaction at the database level.",
      },
      { status: 400 },
    )
  }

  // ── Execute inside a READ ONLY transaction ──────────────────────────────────
  const started = Date.now()
  let rows: Record<string, unknown>[]
  try {
    const result = await runReadonlyQuery(rawSql, STATEMENT_TIMEOUT_MS)
    // postgres.js returns a RowList — cast to plain objects and cap rows.
    rows = (result as unknown as Record<string, unknown>[]).slice(0, MAX_ROWS)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown database error"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const duration_ms = Date.now() - started

  // Derive column names from the first row (or empty if no rows).
  const columns = rows.length > 0 ? Object.keys(rows[0]) : []

  return NextResponse.json({
    columns,
    rows,
    rowCount: rows.length,
    duration_ms,
    capped: rows.length === MAX_ROWS,
  })
}
