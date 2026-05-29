import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { canAccess, type Role } from "@/lib/permissions"
import { VersionClient } from "./version-client"

export default async function VersionPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")
  const role = session.user.role as Role | undefined
  if (!canAccess(role, "version")) redirect("/")

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Version & flags</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mobile app version gates, maintenance mode, and feature flags.
        </p>
      </header>
      <VersionClient />
    </div>
  )
}

