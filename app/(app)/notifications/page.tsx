import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { canAccess, type Role } from "@/lib/permissions"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function NotificationsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  const role = session.user.role as Role | undefined
  if (!canAccess(role, "notifications")) redirect("/")

  const items = [
    {
      title: "Spring product launch",
      body: "Send the launch announcement to all opted-in subscribers.",
      status: "draft" as const,
    },
    {
      title: "Weekly digest",
      body: "Roundup of the most-read articles this week.",
      status: "scheduled" as const,
    },
    {
      title: "Beta access",
      body: "Invite-only beta program for power users.",
      status: "sent" as const,
    },
  ]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compose and schedule outbound messaging campaigns.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle>{item.title}</CardTitle>
                <StatusBadge status={item.status} />
              </div>
              <CardDescription>{item.body}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Placeholder — wire this to your notification provider.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: "draft" | "scheduled" | "sent" }) {
  if (status === "sent") return <Badge variant="default">Sent</Badge>
  if (status === "scheduled") return <Badge variant="secondary">Scheduled</Badge>
  return <Badge variant="outline">Draft</Badge>
}
