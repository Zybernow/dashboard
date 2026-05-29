import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { canAccess, type Role } from "@/lib/permissions"
import { DeletionRequestsClient } from "./deletion-requests-client"

export default async function DeletionRequestsPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")
  const role = session.user.role as Role | undefined
  if (!canAccess(role, "deletion-requests")) redirect("/")

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Deletion requests
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review user-initiated take-break and deletion requests.
        </p>
      </header>
      <DeletionRequestsClient />
    </div>
  )
}

