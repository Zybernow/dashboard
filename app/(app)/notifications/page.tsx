import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { canAccess, type Role } from "@/lib/permissions"
import { NotificationsClient } from "./notifications-client"

export default async function NotificationsPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")
  const role = session.user.role as Role | undefined
  if (!canAccess(role, "notifications")) redirect("/")

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Push Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Send targeted re-engagement push notification campaigns to user segments.
        </p>
      </header>
      <NotificationsClient />
    </div>
  )
}
