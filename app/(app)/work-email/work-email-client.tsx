"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { TrashIcon } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/fetcher"
import type { WorkEmailReviewRequest } from "@/lib/zyber-types"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"

export function WorkEmailClient() {
  return (
    <Tabs defaultValue="reviews">
      <TabsList>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
        <TabsTrigger value="domains">Allowlist</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="reviews" className="pt-4">
        <ReviewsTable />
      </TabsContent>
      <TabsContent value="domains" className="pt-4">
        <DomainAllowlist />
      </TabsContent>
      <TabsContent value="settings" className="pt-4">
        <WorkEmailSettings />
      </TabsContent>
    </Tabs>
  )
}

function ReviewsTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["zyber", "work-email-reviews"],
    queryFn: () =>
      apiFetch<{ requests: WorkEmailReviewRequest[] }>(
        "/api/zyber/work-email-reviews",
      ),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {data ? `${data.requests.length} pending` : "Loading…"}
        </CardTitle>
        <CardDescription>
          Domains a user requested for work-email verification.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="space-y-2 px-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Requester</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>College</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="pr-6 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-6">
                    <div className="font-medium">@{r.username}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.workEmail}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.domain}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.user_profile?.college ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <ReviewActions request={r} />
                  </TableCell>
                </TableRow>
              ))}
              {data && data.requests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No pending reviews.
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

function ReviewActions({ request }: { request: WorkEmailReviewRequest }) {
  const qc = useQueryClient()
  const review = useMutation({
    mutationFn: (input: { action: "approve" | "reject"; note?: string }) =>
      apiFetch<unknown>(
        `/api/zyber/work-email-reviews/${request.id}/${input.action}`,
        {
          method: "POST",
          body: JSON.stringify({ note: input.note ?? "" }),
        },
      ),
    onSuccess: (_, input) => {
      toast.success(`Request ${input.action}d`)
      qc.invalidateQueries({ queryKey: ["zyber", "work-email-reviews"] })
      qc.invalidateQueries({ queryKey: ["zyber", "work-email-domains"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="flex justify-end gap-2">
      <NoteDialog
        label="Reject"
        variant="outline"
        onSubmit={(note) => review.mutate({ action: "reject", note })}
        disabled={review.isPending}
      />
      <Button
        size="sm"
        disabled={review.isPending}
        onClick={() => review.mutate({ action: "approve" })}
      >
        Approve
      </Button>
    </div>
  )
}

function NoteDialog({
  label,
  variant = "outline",
  onSubmit,
  disabled,
}: {
  label: string
  variant?: "outline" | "destructive" | "default" | "ghost"
  onSubmit: (note: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant={variant} disabled={disabled} />}
      >
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            Optional note recorded on the request.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSubmit(note)
              setOpen(false)
            }}
          >
            Confirm {label.toLowerCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DomainAllowlist() {
  const qc = useQueryClient()
  const [domain, setDomain] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["zyber", "work-email-domains"],
    queryFn: () =>
      apiFetch<{ domains: string[] }>("/api/zyber/work-email-domains"),
  })

  const add = useMutation({
    mutationFn: (d: string) =>
      apiFetch<unknown>("/api/zyber/work-email-domains", {
        method: "POST",
        body: JSON.stringify({ domain: d }),
      }),
    onSuccess: () => {
      toast.success("Domain added")
      setDomain("")
      qc.invalidateQueries({ queryKey: ["zyber", "work-email-domains"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const remove = useMutation({
    mutationFn: (d: string) =>
      apiFetch<unknown>(
        `/api/zyber/work-email-domains/${encodeURIComponent(d)}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      toast.success("Domain removed")
      qc.invalidateQueries({ queryKey: ["zyber", "work-email-domains"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allowed work email domains</CardTitle>
        <CardDescription>
          Users with addresses at these domains skip review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const trimmed = domain.trim().toLowerCase()
            if (trimmed) add.mutate(trimmed)
          }}
        >
          <Input
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <Button type="submit" disabled={!domain.trim() || add.isPending}>
            Add
          </Button>
        </form>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : data && data.domains.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {data.domains.map((d) => (
              <li
                key={d}
                className="flex items-center justify-between px-4 py-2"
              >
                <span className="font-mono text-sm">{d}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(d)}
                >
                  <TrashIcon className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No domains added yet.</p>
        )}

        {data && data.domains.length > 0 ? (
          <Badge variant="secondary">
            {data.domains.length} domain{data.domains.length === 1 ? "" : "s"}
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  )
}

function WorkEmailSettings() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["zyber", "work-email-settings"],
    queryFn: () =>
      apiFetch<{ open: boolean }>("/api/zyber/work-email-settings"),
  })

  const toggle = useMutation({
    mutationFn: (open: boolean) =>
      apiFetch<{ open: boolean }>("/api/zyber/work-email-settings", {
        method: "PUT",
        body: JSON.stringify({ open }),
      }),
    onSuccess: (res) => {
      toast.success(
        res.open
          ? "Open for All enabled — any email accepted as work email"
          : "Open for All disabled — allowlist / review required",
      )
      qc.invalidateQueries({ queryKey: ["zyber", "work-email-settings"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work email settings</CardTitle>
        <CardDescription>
          Global controls for the work email verification flow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">Open for All</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, any email address is accepted as a work email without
              domain review. Disabling restores the allowlist / review flow.
            </p>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-11 rounded-full" />
          ) : (
            <Switch
              checked={data?.open ?? false}
              disabled={toggle.isPending}
              onCheckedChange={(checked) => toggle.mutate(checked)}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
