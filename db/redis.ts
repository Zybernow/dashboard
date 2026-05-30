import "server-only"
import Redis from "ioredis"
import fs from "fs"

const globalForRedis = globalThis as unknown as { redisClient?: Redis }

function createRedisClient(): Redis {
  const addr = process.env.REDIS_ADDR ?? "localhost:6379"
  const colonIdx = addr.lastIndexOf(":")
  const host = colonIdx > 0 ? addr.slice(0, colonIdx) : addr
  const port = colonIdx > 0 ? parseInt(addr.slice(colonIdx + 1), 10) : 6379

  const useTLS = process.env.REDIS_TLS === "true"
  const caPath = process.env.REDIS_CA_CERT

  return new Redis({
    host,
    port,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: useTLS
      ? {
          ca: caPath ? fs.readFileSync(caPath) : undefined,
          // Memorystore is reached by private IP; the cert SAN is the instance
          // hostname, not the IP — skip hostname check while still verifying
          // the certificate chain against the provided CA.
          checkServerIdentity: () => undefined,
        }
      : undefined,
    lazyConnect: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    enableOfflineQueue: false,
  })
}

export const redis = globalForRedis.redisClient ?? createRedisClient()
globalForRedis.redisClient = redis
