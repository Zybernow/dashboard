import { config } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

config({ path: '.env' });

const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

export const client =
  globalForDb.pgClient ??
  postgres(process.env.DATABASE_URL!, {
    max: 25,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
  });

// Always persist in globalThis so hot-reloads in dev don't exhaust the pool.
globalForDb.pgClient = client;

export const db = drizzle({ client });
