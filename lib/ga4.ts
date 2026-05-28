import "server-only"
import { BetaAnalyticsDataClient } from "@google-analytics/data"

// The Firebase project's service account JSON, the same one already used by
// the Go backend for FCM. Stored as a single-line JSON string in the
// GOOGLE_SERVICE_ACCOUNT_JSON env var on Vercel so it ships without a file
// mount. The service account must be granted Viewer on the GA4 property.
const SA_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
const PROPERTY_ID = process.env.GA4_PROPERTY_ID

const globalForGa4 = globalThis as unknown as {
  ga4Client?: BetaAnalyticsDataClient
}

function createClient(): BetaAnalyticsDataClient {
  if (!SA_JSON) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set")
  }
  let credentials: Record<string, unknown>
  try {
    credentials = JSON.parse(SA_JSON)
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON")
  }
  return new BetaAnalyticsDataClient({ credentials })
}

export function ga4Client(): BetaAnalyticsDataClient {
  if (!globalForGa4.ga4Client) {
    globalForGa4.ga4Client = createClient()
  }
  return globalForGa4.ga4Client
}

export function ga4PropertyPath(): string {
  if (!PROPERTY_ID) {
    throw new Error("GA4_PROPERTY_ID is not set")
  }
  // Accept bare numeric ID or fully qualified `properties/123`.
  return PROPERTY_ID.startsWith("properties/")
    ? PROPERTY_ID
    : `properties/${PROPERTY_ID}`
}
