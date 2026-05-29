import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { canAccess, type Role } from "@/lib/permissions"
import { LogsClient } from "./logs-client"

export default async function LogsPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")
  const role = session.user.role as Role | undefined
  if (!canAccess(role, "logs")) redirect("/")

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read, clear, and manage backups for server, auth, and error logs.
        </p>
      </header>
      <LogsClient />
    </div>
  )
}

