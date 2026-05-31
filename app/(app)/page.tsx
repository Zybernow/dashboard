import { redirect } from "next/navigation"
import dynamic from "next/dynamic"
import { getSession } from "@/lib/session"
import { getMaintainerSession } from "@/lib/maintainer-session"
import { canAccess, landingSectionFor, type Role } from "@/lib/permissions"
import { Skeleton } from "@/components/ui/skeleton"

const TelemetryDashboard = dynamic(
  () =>
    import("./telemetry-dashboard").then((m) => ({ default: m.TelemetryDashboard })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-96 w-full rounded-lg" />,
  },
)

export default async function TelemetryPage() {
  const session = await getSession()

  if (!session) {
    // Check maintainer session — redirect them to their landing page
    const maintainer = await getMaintainerSession()
    if (!maintainer) redirect("/sign-in")
    const landing = landingSectionFor("maintainer")
    redirect(landing ? `/${landing}` : "/sign-in")
  }

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

