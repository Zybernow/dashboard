import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { canAccess, type Role } from "@/lib/permissions"
import { MaintainersClient } from "./maintainers-client"

export default async function MaintainersPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")
  const role = session.user.role as Role | undefined
  if (!canAccess(role, "maintainers")) redirect("/")

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Maintainers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage college-scoped maintainer accounts.
        </p>
      </header>
      <MaintainersClient />
    </div>
  )
}

