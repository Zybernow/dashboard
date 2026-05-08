import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { count, eq, gt } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { invitation, user } from "@/db/schema"
import { canAccess, landingSectionFor, type Role } from "@/lib/permissions"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function OverviewPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  const role = session.user.role as Role | undefined

  if (!canAccess(role, "overview")) {
    const fallback = landingSectionFor(role)
    if (fallback === "notifications") redirect("/notifications")
    redirect("/sign-in")
  }

  const [[{ value: userCount }], [{ value: pendingInvites }]] = await Promise.all([
    db.select({ value: count() }).from(user),
    db
      .select({ value: count() })
      .from(invitation)
      .where(eq(invitation.status, "pending")),
  ])

  const [{ value: activeInvites }] = await db
    .select({ value: count() })
    .from(invitation)
    .where(gt(invitation.expiresAt, new Date()))

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back, {session.user.name.split(" ")[0]}.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total users" value={userCount} description="Signed up via Google" />
        <StatCard
          label="Pending invitations"
          value={pendingInvites}
          description="Awaiting first sign-in"
        />
        <StatCard
          label="Active invitations"
          value={activeInvites}
          description="Not yet expired"
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string
  value: number
  description: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
