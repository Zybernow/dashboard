"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type InvitationRow = {
  id: string
  email: string
  role: string
  status: string
  expiresAt: string
  createdAt: string
}

export function InvitationsTable({ initial }: { initial: InvitationRow[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function revoke(id: string) {
    setPendingId(id)
    try {
      const res = await fetch(`/api/invitations/${id}`, { method: "DELETE" })
      if (res.ok) {
        startTransition(() => router.refresh())
      }
    } finally {
      setPendingId(null)
    }
  }

  async function revokeAccess(id: string) {
    setPendingId(id)
    try {
      const res = await fetch(`/api/invitations/${id}/revoke-access`, { method: "POST" })
      if (res.ok) {
        startTransition(() => router.refresh())
      }
    } finally {
      setPendingId(null)
    }
  }

  if (initial.length === 0) {
    return (
      <p className="px-6 py-8 text-center text-sm text-muted-foreground">
        No invitations yet. Send one above.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead className="pr-6 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {initial.map((row) => {
          const expired =
            row.status === "pending" && new Date(row.expiresAt) < new Date()
          const effectiveStatus = expired ? "expired" : row.status
          return (
            <TableRow key={row.id}>
              <TableCell className="pl-6 font-medium">{row.email}</TableCell>
              <TableCell>
                <Badge variant="secondary">{row.role}</Badge>
              </TableCell>
              <TableCell>
                <StatusBadge status={effectiveStatus} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(row.expiresAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="pr-6 text-right">
                {row.status === "pending" && !expired ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revoke(row.id)}
                    disabled={pendingId === row.id}
                  >
                    {pendingId === row.id ? "Revoking…" : "Revoke"}
                  </Button>
                ) : row.status === "accepted" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => revokeAccess(row.id)}
                    disabled={pendingId === row.id}
                  >
                    {pendingId === row.id ? "Revoking…" : "Revoke access"}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "accepted":
      return <Badge variant="default">Accepted</Badge>
    case "pending":
      return <Badge variant="secondary">Pending</Badge>
    case "revoked":
      return <Badge variant="destructive">Revoked</Badge>
    case "expired":
      return <Badge variant="outline">Expired</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}
