"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { TrashIcon } from "lucide-react"
import { apiFetch } from "@/lib/fetcher"
import type {
  LogBackupsResponse,
  LogResponse,
  LogType,
} from "@/lib/zyber-types"
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"

const LOG_TYPES: LogType[] = ["server", "auth", "error"]

export function LogsClient() {
  const [type, setType] = useState<LogType>("server")
  const qc = useQueryClient()

  const log = useQuery({
    queryKey: ["zyber", "logs", type],
    queryFn: () => apiFetch<LogResponse>(`/api/zyber/logs/${type}`),
    refetchInterval: 15_000,
  })

  const clear = useMutation({
    mutationFn: () =>
      apiFetch<{ lines_cleared?: number }>(`/api/zyber/logs/${type}`, {
        method: "POST",
      }),
    onSuccess: (data) => {
      toast.success(
        `Cleared ${data.lines_cleared ?? 0} line(s). Backup saved.`,
      )
      qc.invalidateQueries({ queryKey: ["zyber", "logs"] })
      qc.invalidateQueries({ queryKey: ["zyber", "log-backups", type] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="space-y-4">
      <Tabs
        value={type}
        onValueChange={(v) => v && setType(v as LogType)}
      >
        <TabsList>
          {LOG_TYPES.map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="capitalize">{type} log</CardTitle>
            <CardDescription>
              {log.isError
                ? "Failed to load"
                : log.data
                  ? `${log.data.lines.length} line(s)`
                  : "Loading…"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <BackupsSheet type={type} />
            <ClearDialog
              type={type}
              onConfirm={() => clear.mutate()}
              disabled={clear.isPending}
            />
          </div>
        </CardHeader>
        <CardContent>
          {log.isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : log.isError ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-4 text-sm text-destructive">
              <p className="font-medium">Couldn&apos;t load the {type} log.</p>
              <p className="mt-1 font-mono text-xs break-all">
                {log.error instanceof Error ? log.error.message : String(log.error)}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => log.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-96 w-full rounded-md border bg-muted/40">
              <pre className="px-3 py-2 text-xs font-mono whitespace-pre-wrap break-all">
                {log.data?.lines.length
                  ? log.data.lines.join("\n")
                  : "(empty)"}
              </pre>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ClearDialog({
  type,
  onConfirm,
  disabled,
}: {
  type: LogType
  onConfirm: () => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="destructive" size="sm" disabled={disabled} />}
      >
        Clear
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear {type} log?</DialogTitle>
          <DialogDescription>
            The current contents are saved as a backup. The active log file is
            then truncated.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              setOpen(false)
            }}
          >
            Clear & back up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BackupsSheet({ type }: { type: LogType }) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()

  const backups = useQuery({
    queryKey: ["zyber", "log-backups", type],
    queryFn: () =>
      apiFetch<LogBackupsResponse>(`/api/zyber/logs/${type}/backups`),
    enabled: open,
  })

  const remove = useMutation({
    mutationFn: (file: string) =>
      apiFetch<unknown>(
        `/api/zyber/logs/${type}/backups/${encodeURIComponent(file)}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      toast.success("Backup deleted")
      qc.invalidateQueries({ queryKey: ["zyber", "log-backups", type] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeAll = useMutation({
    mutationFn: () =>
      apiFetch<unknown>(`/api/zyber/logs/${type}/backups`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("All backups deleted")
      qc.invalidateQueries({ queryKey: ["zyber", "log-backups", type] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>
        Backups
      </SheetTrigger>
      <SheetContent className="w-[480px] sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle className="capitalize">{type} backups</SheetTitle>
          <SheetDescription>
            Cleared logs are kept for 90 days.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {backups.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : backups.data && backups.data.backups.length > 0 ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                disabled={removeAll.isPending}
                onClick={() => removeAll.mutate()}
              >
                Delete all
              </Button>
              <ul className="divide-y rounded-md border">
                {backups.data.backups.map((b) => (
                  <li
                    key={b.file}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div>
                      <div className="font-mono text-xs">{b.file}</div>
                      <div className="text-xs text-muted-foreground">
                        {(b.size_bytes / 1024).toFixed(1)} KB ·{" "}
                        {new Date(b.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(b.file)}
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
              <Badge variant="secondary">
                {backups.data.backups.length} backup
                {backups.data.backups.length === 1 ? "" : "s"}
              </Badge>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No backups yet.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
