/**
 * One-shot data migration: copies dashboard auth tables from zyber-dashboard → zyber.
 *
 * Usage:
 *   SOURCE_URL="postgres://...zyber-dashboard..." \
 *   TARGET_URL="postgres://...zyber..."           \
 *   npx tsx scripts/migrate-dashboard-to-zyber.ts
 *
 * Safe to re-run: INSERT ... ON CONFLICT DO NOTHING skips existing rows.
 * Does NOT drop or alter anything in the source database.
 */

import postgres from "postgres";

const sourceUrl = process.env.SOURCE_URL;
const targetUrl = process.env.TARGET_URL;

if (!sourceUrl || !targetUrl) {
  console.error("Set SOURCE_URL and TARGET_URL environment variables.");
  process.exit(1);
}

const src = postgres(sourceUrl, { ssl: "require", max: 1 });
const tgt = postgres(targetUrl, { ssl: "require", max: 1 });

async function copyTable(table: string, columns: string[]) {
  const cols = columns.join(", ");
  const rows = await src.unsafe(`SELECT ${cols} FROM ${table}`);
  if (rows.length === 0) {
    console.log(`  ${table}: 0 rows (skipping)`);
    return;
  }

  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  let inserted = 0;
  for (const row of rows) {
    const values = columns.map((c) => (row as Record<string, unknown>)[c]);
    await tgt.unsafe(
      `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
      values as never[],
    );
    inserted++;
  }
  console.log(`  ${table}: ${inserted} rows processed`);
}

async function main() {
  console.log("Starting migration: zyber-dashboard → zyber\n");

  // user first (referenced by session, account, invitation)
  await copyTable('"user"', [
    "id", "name", "email", "email_verified", "image",
    "created_at", "updated_at", "role",
  ]);

  // then dependents (no ordering constraint between these three)
  await copyTable("account", [
    "id", "account_id", "provider_id", "user_id",
    "access_token", "refresh_token", "id_token",
    "access_token_expires_at", "refresh_token_expires_at",
    "scope", "password", "created_at", "updated_at",
  ]);

  await copyTable("session", [
    "id", "expires_at", "token", "created_at", "updated_at",
    "ip_address", "user_agent", "user_id",
  ]);

  await copyTable("verification", [
    "id", "identifier", "value", "expires_at", "created_at", "updated_at",
  ]);

  await copyTable("invitation", [
    "id", "email", "role", "status", "invited_by", "accepted_by",
    "expires_at", "accepted_at", "created_at", "updated_at",
  ]);

  console.log("\nMigration complete.");
  await src.end();
  await tgt.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
