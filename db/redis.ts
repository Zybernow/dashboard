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

  let tlsOptions: object | undefined
  if (useTLS) {
    let ca: Buffer | undefined
    if (caPath) {
      try {
        ca = fs.readFileSync(caPath)
      } catch {
        // CA cert file not present — fall back to skipping verification.
      }
    }
    tlsOptions = ca
      ? {
          ca,
          // Memorystore IP doesn't match the cert's hostname SAN — skip that
          // specific check while still verifying the chain against our CA.
          checkServerIdentity: () => undefined,
        }
      : {
          // No CA cert: still encrypt but don't verify the server certificate.
          // Safe for private VPC-only Memorystore where MITM is not a concern.
          rejectUnauthorized: false,
        }
  }

  return new Redis({
    host,
    port,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: tlsOptions,
    lazyConnect: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    enableOfflineQueue: false,
  })
}

export const redis = globalForRedis.redisClient ?? createRedisClient()
globalForRedis.redisClient = redis
