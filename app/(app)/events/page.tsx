import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getMaintainerSession } from "@/lib/maintainer-session"
import { canAccess, type Role } from "@/lib/permissions"
import { EventsClient } from "./events-client"

export default async function EventsPage() {
  const session = await getSession()
  let role: Role | "maintainer" | undefined

  if (session) {
    role = session.user.role as Role | undefined
  } else {
    const maintainer = await getMaintainerSession()
    if (!maintainer) redirect("/sign-in")
    role = "maintainer"
  }

  if (!canAccess(role, "events")) redirect("/")

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse, create, and edit community events.
        </p>
      </header>
      <EventsClient />
    </div>
  )
}

