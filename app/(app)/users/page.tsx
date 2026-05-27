import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getMaintainerSession } from "@/lib/maintainer-session"
import { canAccess, type Role } from "@/lib/permissions"
import { UsersClient } from "./users-client"

export default async function UsersPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  let role: Role | "maintainer" | undefined

  if (session) {
    role = session.user.role as Role | undefined
  } else {
    const maintainer = await getMaintainerSession()
    if (!maintainer) redirect("/sign-in")
    role = "maintainer"
  }

  if (!canAccess(role, "users")) redirect("/")

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search, enable, disable, or delete user accounts.
        </p>
      </header>
      <UsersClient />
    </div>
  )
}
