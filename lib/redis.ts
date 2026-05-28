import Redis from "ioredis"

const globalForRedis = globalThis as unknown as { redis?: Redis }

function createRedisClient() {
  const addr = process.env.REDIS_ADDR ?? "localhost:6379"
  const [host, portStr] = addr.split(":")
  const port = portStr ? parseInt(portStr, 10) : 6379
  const password = process.env.REDIS_PASSWORD || undefined
  const useTLS = process.env.REDIS_TLS === "true"

  return new Redis({
    host,
    port,
    password,
    tls: useTLS ? {} : undefined,
  })
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
}

// Matches Go backend `redis.UserTTL` — presence entries older than this are
// considered offline. Heartbeat interval is 20s, so 3 min = 9 missed beats.
const USER_TTL_SECONDS = 3 * 60

function presenceCutoff(): number {
  return Math.floor(Date.now() / 1000) - USER_TTL_SECONDS
}

export async function getOnlineUserCount(): Promise<number> {
  try {
    return await redis.zcount("online_users", presenceCutoff(), "+inf")
  } catch (err) {
    console.warn(
      `[redis] getOnlineUserCount failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
    return 0
  }
}

export async function getActiveCallCount(): Promise<number> {
  try {
    let cursor = "0"
    let count = 0
    do {
      const [next, keys] = await redis.scan(
        cursor,
        "MATCH",
        "call:active:*",
        "COUNT",
        100,
      )
      count += keys.length
      cursor = next
    } while (cursor !== "0")
    return Math.floor(count / 2)
  } catch (err) {
    console.warn(
      `[redis] getActiveCallCount failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
    return 0
  }
}
