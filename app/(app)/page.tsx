import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { canAccess, landingSectionFor, type Role } from "@/lib/permissions"
import { TelemetryDashboard } from "./telemetry-dashboard"

export default async function TelemetryPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  const role = session.user.role as Role | undefined
  if (!canAccess(role, "telemetry")) {
    const fallback = landingSectionFor(role)
    if (fallback && fallback !== "telemetry") redirect("/" + fallback)
    redirect("/sign-in")
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Telemetry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live metrics from the Zyber server.
        </p>
      </header>
      <TelemetryDashboard />
    </div>
  )
}
