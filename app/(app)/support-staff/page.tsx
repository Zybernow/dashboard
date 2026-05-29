import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { canAccess, type Role } from "@/lib/permissions"
import { SupportStaffClient } from "./support-staff-client"

export default async function SupportStaffPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")
  const role = session.user.role as Role | undefined
  if (!canAccess(role, "support-staff")) redirect("/")

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Support Staff</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage support staff accounts — scoped access to push notification campaigns only.
        </p>
      </header>
      <SupportStaffClient />
    </div>
  )
}
