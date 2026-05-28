import { type NextRequest, NextResponse } from "next/server"
import { requireSection } from "@/lib/api-route"
import { runReadonlyQuery } from "@/db/prod/readonly"

const MAX_ROWS = 500
const STATEMENT_TIMEOUT_MS = 10_000

// Dangerous keywords/functions to reject even if the query starts with SELECT.
// The Postgres READ ONLY transaction blocks data modification, but it does NOT
// block side-effect functions (signals, file reads, network, sleep) or
// privilege/session changes. This list is defence-in-depth on top of the
// engine-level READ ONLY guarantee.
const BANNED_TOKENS = [
  // DML / DDL (also blocked by READ ONLY, kept here so we fail fast with a
  // clear error before the query reaches the database)
  "insert",
  "update",
  "delete",
  "merge",
  "truncate",
  "copy",
  "drop",
  "create",
  "alter",
  "rename",
  // Permission / role management
  "grant",
  "revoke",
  "reassign",
  "security",
  // Session / server state
  "set",
  "reset",
  "lock",
  "vacuum",
  "analyze",
  "cluster",
  "reindex",
  "refresh",
  "checkpoint",
  "discard",
  "listen",
  "notify",
  "unlisten",
  "prepare",
  "deallocate",
  "execute",
  "call",
  "do",
  // Side-effect / dangerous built-in functions
  "pg_terminate_backend",
  "pg_cancel_backend",
  "pg_reload_conf",
  "pg_rotate_logfile",
  "pg_promote",
  "pg_read_file",
  "pg_read_binary_file",
  "pg_ls_dir",
  "pg_stat_file",
  "pg_create_physical_replication_slot",
  "pg_create_logical_replication_slot",
  "pg_drop_replication_slot",
  "pg_advisory_lock",
  "pg_advisory_xact_lock",
  "pg_sleep",
  "pg_sleep_for",
  "pg_sleep_until",
  "dblink",
  "dblink_connect",
  "dblink_exec",
  "lo_import",
  "lo_export",
  "lo_creat",
  "lo_create",
  "lo_unlink",
  "copy_from_program",
] as const

const BANNED_RE = new RegExp(
  String.raw`\b(${BANNED_TOKENS.join("|")})\b`,
  "i",
)

type ValidationResult = { ok: true } | { ok: false; reason: string }

function validateReadOnlySql(rawSql: string): ValidationResult {
  // Strip comments so they can't hide dangerous tokens, e.g.
  //   SELECT 1; /* */ DROP TABLE users
  const noBlockComments = rawSql.replace(/\/\*[\s\S]*?\*\//g, " ")
  const noComments = noBlockComments.replace(/--[^\n]*/g, " ")
  const trimmed = noComments.trim()

  if (!trimmed) return { ok: false, reason: "SQL query is empty." }

  // Reject multiple statements. A single trailing semicolon is allowed.
  const withoutTrailing = trimmed.replace(/;+\s*$/, "").trim()
  if (withoutTrailing.includes(";")) {
    return {
      ok: false,
      reason: "Multiple statements are not allowed. Run one query at a time.",
    }
  }

  // First non-comment, non-whitespace token must be SELECT. Disallow WITH
  // because data-modifying CTEs (WITH x AS (DELETE …)) start with WITH.
  if (!/^select\b/i.test(withoutTrailing)) {
    return {
      ok: false,
      reason: "Only SELECT statements are allowed.",
    }
  }

  // Mask single-quoted string literals so a column value like 'INSERT' doesn't
  // trip the keyword check.
  const masked = withoutTrailing.replace(/'(?:[^']|'')*'/g, "''")

  const match = masked.match(BANNED_RE)
  if (match) {
    return {
      ok: false,
      reason: `Disallowed keyword or function: "${match[1].toLowerCase()}".`,
    }
  }

  return { ok: true }
}

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

  // ── Defence-in-depth: validate before executing ─────────────────────────────
  const validation = validateReadOnlySql(rawSql)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 })
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
