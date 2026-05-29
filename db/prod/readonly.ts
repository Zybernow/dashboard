/**
 * Read-only postgres client for the SQL Explorer.
 *
 * Every query is executed inside a PostgreSQL READ ONLY transaction, so the
 * database engine itself will reject any DML (INSERT / UPDATE / DELETE / DROP /
 * TRUNCATE …) — regardless of what SQL text is passed in.
 *
 * To swap to a dedicated read-only database user, set DATABASE_URL_READONLY
 * in .env; otherwise it falls back to DATABASE_URL with the same credentials
 * but the READ ONLY transaction guard is still active.
 */

import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env" })

const url =
  process.env.DATABASE_URL_READONLY ?? process.env.DATABASE_URL

if (!url) {
  throw new Error(
    "Neither DATABASE_URL_READONLY nor DATABASE_URL is set.",
  )
}

const globalForReadonly = globalThis as unknown as {
  pgReadonly?: ReturnType<typeof postgres>
}

const pgReadonly =
  globalForReadonly.pgReadonly ??
  postgres(url, {
    // Intentionally small pool — this is only used for on-demand SQL explorer queries.
    max: 3,
    idle_timeout: 20,
    max_lifetime: 60 * 10,
    connect_timeout: 10,
  })

if (process.env.NODE_ENV !== "production") {
  globalForReadonly.pgReadonly = pgReadonly
}

/**
 * Run `rawSql` inside a READ ONLY transaction with a statement-level timeout.
 * Returns an array of plain objects (one per row).
 */
export async function runReadonlyQuery(
  rawSql: string,
  timeoutMs = 10_000,
): Promise<postgres.RowList<postgres.Row[]>> {
  return pgReadonly.begin("READ ONLY", async (tx) => {
    // statement_timeout is LOCAL to this transaction only.
    // Use unsafe() because postgres.js would parameterize ${timeoutMs} as $1,
    // and PostgreSQL rejects parameter placeholders in SET LOCAL statements.
    // timeoutMs is a hardcoded constant, not user input, so this is safe.
    await tx.unsafe(`SET LOCAL statement_timeout = ${timeoutMs}`)
    return tx.unsafe(rawSql)
  })
}
