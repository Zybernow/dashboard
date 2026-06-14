import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { requireSection } from "@/lib/api-route"
import { dbProd } from "@/db/prod/drizzle"
import { appVersionConfig } from "@/db/prod/schema"
import type { FeatureFlags, VersionConfig } from "@/lib/zyber-types"

// Mirrors config.DefaultFeatureFlags() in the Go server: client-gated flags
// default on so older rows behave as fully enabled; community-chat push gates a
// server behavior and stays off until explicitly enabled.
const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  chatEditEnabled: true,
  chatDeleteEnabled: true,
  chatReplyEnabled: true,
  chatReactionsEnabled: true,
  callRecordsEnabled: true,
  accountDeletionEnabled: true,
  communityChatPushEnabled: false,
}

export async function GET() {
  const auth = await requireSection("version")
  if (auth.error) return auth.error

  try {
    const rows = await dbProd
      .select()
      .from(appVersionConfig)
      .where(eq(appVersionConfig.id, 1))
      .limit(1)
    const row = rows[0]
    if (!row) {
      return NextResponse.json(
        { error: "version config not initialized" },
        { status: 500 },
      )
    }
    const payload: VersionConfig = {
      latest_version: row.latestVersion,
      min_supported_version: row.minSupportedVersion,
      force_update: row.forceUpdate,
      maintenance_mode: row.maintenanceMode,
      ios_update_url: row.iosUpdateUrl,
      android_update_url: row.androidUpdateUrl,
      featureFlags: row.featureFlags as FeatureFlags,
      workEmailOpen: row.workEmailOpen,
    }
    return NextResponse.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Writes the version config straight to Postgres, mirroring GET. The Go server
// reads app_version_config live on every request (no in-memory cache), so
// maintenance mode and feature flags reach mobile clients immediately. The
// previous proxy to the Go admin API left writes on a separate path from the
// direct-Postgres GET, so toggles never showed up in the dashboard's reads.
export async function PUT(req: NextRequest) {
  const auth = await requireSection("version")
  if (auth.error) return auth.error

  const body = (await req.json().catch(() => null)) as Partial<VersionConfig> | null
  if (!body) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 })
  }

  const latestVersion = (body.latest_version ?? "").trim()
  const minSupportedVersion = (body.min_supported_version ?? "").trim()
  if (!latestVersion || !minSupportedVersion) {
    return NextResponse.json(
      { error: "latest_version and min_supported_version are required" },
      { status: 400 },
    )
  }

  const featureFlags: FeatureFlags = {
    ...DEFAULT_FEATURE_FLAGS,
    ...(body.featureFlags ?? {}),
  }

  const values = {
    latestVersion,
    minSupportedVersion,
    forceUpdate: Boolean(body.force_update),
    maintenanceMode: Boolean(body.maintenance_mode),
    iosUpdateUrl: (body.ios_update_url ?? "").trim(),
    androidUpdateUrl: (body.android_update_url ?? "").trim(),
    featureFlags,
    workEmailOpen: Boolean(body.workEmailOpen),
    updatedAt: new Date(),
  }

  try {
    const [row] = await dbProd
      .insert(appVersionConfig)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({ target: appVersionConfig.id, set: values })
      .returning()

    const payload: VersionConfig = {
      latest_version: row.latestVersion,
      min_supported_version: row.minSupportedVersion,
      force_update: row.forceUpdate,
      maintenance_mode: row.maintenanceMode,
      ios_update_url: row.iosUpdateUrl,
      android_update_url: row.androidUpdateUrl,
      featureFlags: row.featureFlags as FeatureFlags,
      workEmailOpen: row.workEmailOpen,
    }
    return NextResponse.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
