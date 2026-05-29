import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { canAccess, type Role } from "@/lib/permissions"

import { SqlExplorerClient } from "./sql-client"

export default async function SqlExplorerPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")

  const role = session.user.role as Role | undefined
  if (!canAccess(role, "sql-explorer")) redirect("/")

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">SQL Explorer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Execute read-only queries against the production database. All queries
          run inside a{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            READ ONLY
          </code>{" "}
          transaction — mutations are blocked at the database level.
        </p>
      </header>

      <SqlExplorerClient />
    </div>
  )
}

