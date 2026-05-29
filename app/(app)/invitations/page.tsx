import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { db } from "@/db/drizzle"
import { desc } from "drizzle-orm"
import { invitation } from "@/db/schema"

import { auth } from "@/lib/auth"
import { canAccess, type Role } from "@/lib/permissions"

import { InviteForm } from "./invite-form"
import { InvitationsTable } from "./invitations-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function InvitationsPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")

  const role = session.user.role as Role | undefined
  if (!canAccess(role, "invitations")) redirect("/")

  const rows = await db
    .select()
    .from(invitation)
    .orderBy(desc(invitation.createdAt))
    .limit(200)

  const initial = rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    status: r.status,
    expiresAt: r.expiresAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Invitations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Whitelist a user by sending them an invitation. Only invited emails can sign in.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Send invitation</CardTitle>
          <CardDescription>
            Pick a role — the invitee will be created with this role on first sign-in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent invitations</CardTitle>
          <CardDescription>Pending invitations control who can sign up.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <InvitationsTable initial={initial} />
        </CardContent>
      </Card>
    </div>
  )
}

