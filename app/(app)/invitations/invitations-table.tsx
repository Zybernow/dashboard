"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "marketing", label: "Marketing" },
  { value: "admin", label: "Admin" },
]

export function InvitationsTable({ initial }: { initial: InvitationRow[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function remove(id: string) {
    setPendingId(id)
    try {
      const res = await fetch(`/api/invitations/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Access removed")
        startTransition(() => router.refresh())
      } else {
        toast.error("Could not remove access")
      }
    } finally {
      setPendingId(null)
    }
  }

  async function changeRole(id: string, role: string) {
    setPendingId(id)
    try {
      const res = await fetch(`/api/invitations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        toast.success("Role updated")
        startTransition(() => router.refresh())
      } else {
        toast.error("Could not update role")
      }
    } finally {
      setPendingId(null)
    }
  }

  async function resend(id: string) {
    setPendingId(id)
    try {
      const res = await fetch(`/api/invitations/${id}/resend`, { method: "POST" })
      if (res.ok) {
        toast.success("Invitation email resent")
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(`Could not resend: ${data.error ?? "unknown error"}`)
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
          const busy = pendingId === row.id
          return (
            <TableRow key={row.id}>
              <TableCell className="pl-6 font-medium">{row.email}</TableCell>
              <TableCell>
                <Select
                  value={row.role}
                  onValueChange={(v) => v && v !== row.role && changeRole(row.id, v)}
                  disabled={busy}
                >
                  <SelectTrigger size="sm" className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <StatusBadge status={effectiveStatus} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(row.expiresAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="pr-6 text-right">
                <div className="flex items-center justify-end gap-1">
                  {row.status === "pending" && !expired ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resend(row.id)}
                      disabled={busy}
                    >
                      Resend
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => remove(row.id)}
                    disabled={busy}
                  >
                    {busy ? "Removing…" : "Remove"}
                  </Button>
                </div>
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
