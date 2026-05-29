"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { CopyIcon, TrashIcon } from "lucide-react"
import { apiFetch } from "@/lib/fetcher"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"

type SupportStaffMember = {
  id: number
  username: string
  display_name: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export function SupportStaffClient() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["zyber", "support-staff"],
    queryFn: () =>
      apiFetch<{ support_staff: SupportStaffMember[] }>("/api/zyber/support-staff"),
  })

  const remove = useMutation({
    mutationFn: (id: number) =>
      apiFetch<unknown>(`/api/zyber/support-staff/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Support staff member deleted")
      qc.invalidateQueries({ queryKey: ["zyber", "support-staff"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      apiFetch<SupportStaffMember>(`/api/zyber/support-staff/${id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["zyber", "support-staff"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>
            {data
              ? `${data.support_staff.length} support staff member${data.support_staff.length === 1 ? "" : "s"}`
              : "Loading…"}
          </CardTitle>
          <CardDescription>
            Support staff can only access the push notification campaigns section.
          </CardDescription>
        </div>
        <CreateSupportStaffDialog />
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="space-y-2 px-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Username</TableHead>
                <TableHead>Display name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.support_staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="pl-6 font-mono text-sm">
                    @{s.username}
                  </TableCell>
                  <TableCell className="font-medium">{s.display_name}</TableCell>
                  <TableCell>
                    <Switch
                      checked={s.is_active}
                      disabled={toggle.isPending}
                      onCheckedChange={(checked) =>
                        toggle.mutate({ id: s.id, is_active: checked })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.created_by}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={remove.isPending}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => remove.mutate(s.id)}
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data && data.support_staff.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No support staff members yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function CreateSupportStaffDialog() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () =>
      apiFetch<{ support_staff: SupportStaffMember; generated_password: string }>(
        "/api/zyber/support-staff",
        {
          method: "POST",
          body: JSON.stringify({ username: username.trim(), display_name: displayName.trim() }),
        },
      ),
    onSuccess: (data) => {
      toast.success("Support staff account created")
      qc.invalidateQueries({ queryKey: ["zyber", "support-staff"] })
      setGeneratedPassword(data.generated_password)
      setUsername("")
      setDisplayName("")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleClose = (v: boolean) => {
    setOpen(v)
    if (!v) setGeneratedPassword(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger render={<Button size="sm">Add staff</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add support staff</DialogTitle>
          <DialogDescription>
            A random password will be generated and shown once. The account can
            only access push notification campaigns.
          </DialogDescription>
        </DialogHeader>
        {generatedPassword ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Account created. Copy the password — it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
              <code className="flex-1 break-all text-sm">{generatedPassword}</code>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  navigator.clipboard.writeText(generatedPassword)
                  toast.success("Copied")
                }}
              >
                <CopyIcon className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="support_alice"
              />
            </div>
            <div className="space-y-1">
              <Label>Display name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alice"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)}>
            {generatedPassword ? "Close" : "Cancel"}
          </Button>
          {!generatedPassword ? (
            <Button
              disabled={!username.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              Create account
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
