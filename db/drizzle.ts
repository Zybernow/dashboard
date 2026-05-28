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
    max: 10,
    idle_timeout: 30,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pgClient = client;
}

export const db = drizzle({ client });
