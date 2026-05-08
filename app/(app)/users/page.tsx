import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { desc } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { user } from "@/db/schema"
import { canAccess, type Role } from "@/lib/permissions"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default async function UsersPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  const role = session.user.role as Role | undefined
  if (!canAccess(role, "users")) redirect("/")

  const users = await db
    .select()
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(200)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone who has signed in to the workspace.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{users.length} member{users.length === 1 ? "" : "s"}</CardTitle>
          <CardDescription>Sorted by most recently joined.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="pr-6">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="pl-6 font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6 text-muted-foreground">
                    {u.createdAt.toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
