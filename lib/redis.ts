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
