"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { BellOffIcon, PlusIcon } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"

type Campaign = {
  id: number
  segment: string
  title: string
  body: string
  status: string
  audience_size: number
  sent_count: number
  failed_count: number
  opened_count: number
  created_by: string
  created_at: string
  started_at: string | null
  completed_at: string | null
  custom_emails?: string[]
  custom_colleges?: string[]
}

const SEGMENTS = [
  { value: "not_onboarded", label: "Not Onboarded" },
  { value: "no_work_email", label: "No Work Email" },
  { value: "verified", label: "Work Email Verified" },
  { value: "work_email_not_approved", label: "Work Email Not Approved" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "custom_emails", label: "Custom Emails (list)" },
  { value: "custom_colleges", label: "Custom Colleges (list)" },
]

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  queued: "outline",
  running: "default",
  completed: "secondary",
  cancelled: "secondary",
  failed: "destructive",
}

export function NotificationsClient() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["zyber", "notifications-campaigns"],
    queryFn: () =>
      apiFetch<{ campaigns: Campaign[] }>("/api/zyber/notifications/campaigns"),
  })

  const cancel = useMutation({
    mutationFn: (id: number) =>
      apiFetch<unknown>(`/api/zyber/notifications/campaigns/${id}`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Campaign cancelled")
      qc.invalidateQueries({ queryKey: ["zyber", "notifications-campaigns"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>
              {data
                ? `${data.campaigns?.length ?? 0} campaign${(data.campaigns?.length ?? 0) === 1 ? "" : "s"}`
                : "Loading…"}
            </CardTitle>
            <CardDescription>
              Campaigns are processed asynchronously by the notification worker.
            </CardDescription>
          </div>
          <CreateCampaignDialog />
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
                  <TableHead className="pl-6">Title</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Sent / Failed</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.campaigns?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-6">
                      <div className="font-medium">{c.title}</div>
                      <div className="max-w-xs truncate text-xs text-muted-foreground">
                        {c.body}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {SEGMENTS.find((s) => s.value === c.segment)?.label ??
                          c.segment}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={STATUS_VARIANTS[c.status] ?? "outline"}
                        className="capitalize"
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.audience_size.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.sent_count.toLocaleString()} /{" "}
                      {c.failed_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {(c.status === "queued" || c.status === "running") ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={cancel.isPending}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => cancel.mutate(c.id)}
                        >
                          <BellOffIcon className="mr-1 size-4" />
                          Cancel
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
                {data && (!data.campaigns || data.campaigns.length === 0) ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      No campaigns yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CreateCampaignDialog() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [segment, setSegment] = useState("not_onboarded")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [customList, setCustomList] = useState("")
  const [dryRunResult, setDryRunResult] = useState<{
    audience_size?: number
    email_diagnostics?: { email: string; status: string }[]
    college_diagnostics?: { college: string; audience_size: number }[]
  } | null>(null)

  const isCustom =
    segment === "custom_emails" || segment === "custom_colleges"

  const dryRun = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { segment }
      if (segment === "custom_emails") {
        payload.custom_emails = customList
          .split(/[\n,;]+/)
          .map((e) => e.trim())
          .filter(Boolean)
      }
      if (segment === "custom_colleges") {
        payload.custom_colleges = customList
          .split(/\n/)
          .map((e) => e.trim())
          .filter(Boolean)
      }
      return apiFetch<typeof dryRunResult>(
        "/api/zyber/notifications/campaigns/dry-run",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      )
    },
    onSuccess: (data) => setDryRunResult(data),
    onError: (err: Error) => toast.error(err.message),
  })

  const create = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { segment, title, body }
      if (segment === "custom_emails") {
        payload.custom_emails = customList
          .split(/[\n,;]+/)
          .map((e) => e.trim())
          .filter(Boolean)
      }
      if (segment === "custom_colleges") {
        payload.custom_colleges = customList
          .split(/\n/)
          .map((e) => e.trim())
          .filter(Boolean)
      }
      return apiFetch<unknown>("/api/zyber/notifications/campaigns", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      toast.success("Campaign queued")
      qc.invalidateQueries({ queryKey: ["zyber", "notifications-campaigns"] })
      setOpen(false)
      setTitle("")
      setBody("")
      setSegment("not_onboarded")
      setCustomList("")
      setDryRunResult(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setDryRunResult(null)
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon className="mr-1 size-4" />
            New campaign
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New push notification campaign</DialogTitle>
          <DialogDescription>
            Run a dry-run first to preview the audience before sending.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Segment</Label>
            <Select value={segment} onValueChange={(v) => { setSegment(v); setDryRunResult(null) }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEGMENTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isCustom ? (
            <div className="space-y-1">
              <Label>
                {segment === "custom_emails"
                  ? "Emails (one per line or comma-separated)"
                  : "Colleges (one per line)"}
              </Label>
              <Textarea
                rows={5}
                value={customList}
                onChange={(e) => setCustomList(e.target.value)}
                placeholder={
                  segment === "custom_emails"
                    ? "alice@example.com\nbob@example.com"
                    : "IIT Bombay\nIIT Delhi"
                }
              />
            </div>
          ) : null}
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hey, we miss you!" />
          </div>
          <div className="space-y-1">
            <Label>Body</Label>
            <Textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Come back and connect with your network…"
            />
          </div>
          {dryRunResult ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">
                Dry-run:{" "}
                <span className="text-primary">
                  {dryRunResult.audience_size?.toLocaleString() ?? "—"} recipients
                </span>
              </p>
              {dryRunResult.email_diagnostics &&
                dryRunResult.email_diagnostics.length > 0 ? (
                <ul className="mt-2 max-h-32 overflow-y-auto space-y-0.5">
                  {dryRunResult.email_diagnostics.map((d) => (
                    <li key={d.email} className="flex justify-between gap-2 text-xs">
                      <span className="truncate text-muted-foreground">{d.email}</span>
                      <Badge
                        variant={d.status === "matched" ? "default" : "secondary"}
                        className="shrink-0 text-xs"
                      >
                        {d.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            disabled={dryRun.isPending || (!title.trim())}
            onClick={() => dryRun.mutate()}
          >
            Dry run
          </Button>
          <Button
            disabled={!title.trim() || !body.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            Send campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
