import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { canAccess, type Role } from "@/lib/permissions"
import { AnnouncementsClient } from "./announcements-client"

export default async function AnnouncementsPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")
  const role = session.user.role as Role | undefined
  if (!canAccess(role, "announcements")) redirect("/")

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage in-app announcement popups shown to users.
        </p>
      </header>
      <AnnouncementsClient />
    </div>
  )
}
