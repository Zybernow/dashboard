"use client"

import {
  getCoreRowModel,
  useReactTable,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  CheckCircle2Icon,
  CircleSlashIcon,
  GraduationCapIcon,
  SearchIcon,
  ShieldXIcon,
  XIcon,
} from "lucide-react"
import { apiFetch } from "@/lib/fetcher"
import type { AdminUsersPage } from "@/lib/zyber-types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/ui/data-table"
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { DataTableViewOptions } from "@/components/ui/data-table-view-options"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { buildUserColumns, type SortKey } from "./columns"

type StatusValue = "active" | "disabled" | "banned"
type YesNo = "yes" | "no"

type FilterState = {
  search: string
  college: string
  status: StatusValue | null
  workEmail: YesNo | null
  onboarding: YesNo | null
  sort: SortKey
  order: "asc" | "desc"
  page: number
  limit: number
}

const DEFAULT_LIMIT = 25

function parseFilters(p: URLSearchParams): FilterState {
  const status = p.get("status")
  const workEmail = p.get("work_email")
  const onboarding = p.get("onboarding")
  const sort = p.get("sort")
  const order = p.get("order")
  const page = Number.parseInt(p.get("page") ?? "1", 10)
  const limit = Number.parseInt(p.get("limit") ?? String(DEFAULT_LIMIT), 10)

  return {
    search: p.get("search") ?? "",
    college: p.get("college") ?? "",
    status:
      status === "active" || status === "disabled" || status === "banned"
        ? status
        : null,
    workEmail: workEmail === "yes" || workEmail === "no" ? workEmail : null,
    onboarding: onboarding === "yes" || onboarding === "no" ? onboarding : null,
    sort:
      sort === "username" || sort === "email" || sort === "first_name"
        ? sort
        : "created_at",
    order: order === "asc" ? "asc" : "desc",
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    limit:
      Number.isFinite(limit) && limit > 0 && limit <= 100 ? limit : DEFAULT_LIMIT,
  }
}

function urlParams(f: FilterState): URLSearchParams {
  const p = new URLSearchParams()
  if (f.search) p.set("search", f.search)
  if (f.college.trim()) p.set("college", f.college.trim())
  if (f.status) p.set("status", f.status)
  if (f.workEmail) p.set("work_email", f.workEmail)
  if (f.onboarding) p.set("onboarding", f.onboarding)
  if (f.sort !== "created_at") p.set("sort", f.sort)
  if (f.order !== "desc") p.set("order", f.order)
  if (f.page > 1) p.set("page", String(f.page))
  if (f.limit !== DEFAULT_LIMIT) p.set("limit", String(f.limit))
  return p
}

function apiQuery(f: FilterState): URLSearchParams {
  const p = new URLSearchParams()
  p.set("page", String(f.page))
  p.set("limit", String(f.limit))
  if (f.search) p.set("search", f.search)
  if (f.college.trim()) p.set("college", f.college.trim())
  if (f.status === "active") p.set("active", "yes")
  if (f.status === "disabled") {
    p.set("active", "no")
    p.set("disabled", "no")
  }
  if (f.status === "banned") p.set("disabled", "yes")
  if (f.workEmail) p.set("work_email", f.workEmail)
  if (f.onboarding) p.set("onboarding", f.onboarding)
  p.set("sort", f.sort)
  p.set("order", f.order)
  return p
}

const STATUS_OPTIONS = [
  { label: "Active", value: "active", icon: CheckCircle2Icon },
  { label: "Disabled", value: "disabled", icon: CircleSlashIcon },
  { label: "Banned", value: "banned", icon: ShieldXIcon },
]

const WORK_EMAIL_OPTIONS = [
  { label: "Verified", value: "yes", icon: CheckCircle2Icon },
  { label: "Unverified", value: "no", icon: CircleSlashIcon },
]

const ONBOARDING_OPTIONS = [
  { label: "Complete", value: "yes", icon: GraduationCapIcon },
  { label: "Incomplete", value: "no", icon: CircleSlashIcon },
]

export function UsersClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  )

  const [searchInput, setSearchInput] = useState(filters.search)
  useEffect(() => setSearchInput(filters.search), [filters.search])

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const writeFilters = (patch: Partial<FilterState>, resetPage = true) => {
    const merged = { ...filters, ...patch }
    if (resetPage && patch.page === undefined) merged.page = 1
    const qs = urlParams(merged).toString()
    router.replace(qs ? `?${qs}` : "?", { scroll: false })
  }

  // Debounce search input → URL
  useEffect(() => {
    if (searchInput === filters.search) return
    const t = window.setTimeout(() => writeFilters({ search: searchInput }), 300)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const queryString = apiQuery(filters).toString()
  const qc = useQueryClient()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["zyber", "users", queryString],
    queryFn: () =>
      apiFetch<AdminUsersPage>(`/api/zyber/users?${queryString}`),
    placeholderData: (prev) => prev,
  })

  const workEmail = useMutation({
    mutationFn: ({ username, verified }: { username: string; verified: boolean }) =>
      apiFetch<unknown>(`/api/zyber/users/${encodeURIComponent(username)}/work-email-verified`, {
        method: "POST",
        body: JSON.stringify({ verified }),
      }),
    onSuccess: (_, { verified }) => {
      toast.success(verified ? "Work email verified" : "Work email unverified")
      qc.invalidateQueries({ queryKey: ["zyber", "users"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const ACTION_LABELS: Record<string, string> = {
    disable: "User disabled",
    enable: "User enabled",
    delete: "User deleted",
    ban: "User banned",
    unban: "User unbanned",
  }

  const action = useMutation({
    mutationFn: (input: {
      action: "disable" | "enable" | "delete" | "ban" | "unban"
      email: string
      username: string
    }) =>
      apiFetch<unknown>("/api/zyber/users/action", {
        method: "POST",
        body: JSON.stringify({ action: input.action, email: input.email }),
      }),
    onSuccess: (_, input) => {
      toast.success(ACTION_LABELS[input.action] ?? `User ${input.action}d`)
      qc.invalidateQueries({ queryKey: ["zyber", "users"] })
      setPendingDelete(null)
      setPendingBan(null)
    },
    onError: (err: Error) => {
      toast.error(err.message)
      setPendingDelete(null)
      setPendingBan(null)
    },
  })

  const [pendingDelete, setPendingDelete] = useState<{
    email: string
    username: string
    resolve: () => void
    reject: () => void
  } | null>(null)

  const [pendingBan, setPendingBan] = useState<{
    email: string
    username: string
  } | null>(null)

  const handleAction = (input: {
    action: "disable" | "enable" | "delete" | "ban" | "unban"
    email: string
    username: string
  }) => {
    if (input.action === "delete") {
      setPendingDelete({
        email: input.email,
        username: input.username,
        resolve: () => {},
        reject: () => {},
      })
      return
    }
    if (input.action === "ban") {
      setPendingBan({ email: input.email, username: input.username })
      return
    }
    action.mutate(input)
  }

  const columns = useMemo(
    () =>
      buildUserColumns({
        sort: filters.sort,
        order: filters.order,
        onSort: (key) => {
          const order =
            filters.sort === key && filters.order === "asc" ? "desc" : "asc"
          writeFilters({ sort: key, order })
        },
        isMutating: action.isPending || workEmail.isPending,
        onAction: handleAction,
        onWorkEmailToggle: (username, verified) =>
          workEmail.mutate({ username, verified }),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters.sort, filters.order, action.isPending, workEmail.isPending],
  )

  const sorting: SortingState = [
    { id: filters.sort, desc: filters.order === "desc" },
  ]

  const total = data?.total ?? 0
  const totalPages = data?.total_pages ?? 0

  const table = useReactTable<AdminUsersPage["users"][number]>({
    data: data?.users ?? [],
    columns,
    state: {
      sorting,
      columnVisibility,
      pagination: {
        pageIndex: filters.page - 1,
        pageSize: filters.limit,
      },
    },
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      const first = next[0]
      if (!first) return
      writeFilters({
        sort: first.id as SortKey,
        order: first.desc ? "desc" : "asc",
      })
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex: filters.page - 1, pageSize: filters.limit })
          : updater
      writeFilters(
        {
          page: next.pageIndex + 1,
          limit: next.pageSize,
        },
        false,
      )
    },
    rowCount: total,
    pageCount: totalPages,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    getRowId: (row) => row.username,
    getCoreRowModel: getCoreRowModel(),
  })

  const hasActiveFilters =
    filters.search !== "" ||
    filters.college !== "" ||
    filters.status !== null ||
    filters.workEmail !== null ||
    filters.onboarding !== null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>
              {isLoading
                ? "Loading…"
                : `${total.toLocaleString()} ${total === 1 ? "user" : "users"}`}
              {isFetching && !isLoading ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  refreshing…
                </span>
              ) : null}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <BulkDialog />
            <AllToggleDialog />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-72">
              <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 pr-8 h-8"
                placeholder="username, email, name…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-4" />
                </button>
              ) : null}
            </div>
            <Input
              className="h-8 w-full sm:w-48"
              placeholder="College (exact)"
              value={filters.college}
              onChange={(e) => writeFilters({ college: e.target.value })}
            />
            <DataTableFacetedFilter
              title="Status"
              singleSelect
              options={STATUS_OPTIONS}
              selected={filters.status ? [filters.status] : []}
              onChange={(v) =>
                writeFilters({ status: (v[0] as StatusValue | undefined) ?? null })
              }
            />
            <DataTableFacetedFilter
              title="Work email"
              singleSelect
              options={WORK_EMAIL_OPTIONS}
              selected={filters.workEmail ? [filters.workEmail] : []}
              onChange={(v) =>
                writeFilters({ workEmail: (v[0] as YesNo | undefined) ?? null })
              }
            />
            <DataTableFacetedFilter
              title="Onboarding"
              singleSelect
              options={ONBOARDING_OPTIONS}
              selected={filters.onboarding ? [filters.onboarding] : []}
              onChange={(v) =>
                writeFilters({ onboarding: (v[0] as YesNo | undefined) ?? null })
              }
            />
            {hasActiveFilters ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  setSearchInput("")
                  router.replace("?", { scroll: false })
                }}
              >
                Reset
                <XIcon className="ml-1 size-4" />
              </Button>
            ) : null}
            <div className="ml-auto">
              <DataTableViewOptions table={table} />
            </div>
          </div>

          <div className="rounded-md border">
            <DataTable
              table={table}
              isLoading={isLoading}
              loadingRowCount={filters.limit > 12 ? 12 : filters.limit}
              emptyState="No users matched."
            />
          </div>

          <DataTablePagination
            table={table}
            pageSizes={[10, 25, 50, 100]}
            totalLabel={(n) =>
              `${n.toLocaleString()} ${n === 1 ? "user" : "users"} total`
            }
          />
        </CardContent>
      </Card>

      {pendingDelete ? (
        <DeleteUserDialog
          email={pendingDelete.email}
          username={pendingDelete.username}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            action.mutate({
              action: "delete",
              email: pendingDelete.email,
              username: pendingDelete.username,
            })
          }}
          isPending={action.isPending}
        />
      ) : null}

      {pendingBan ? (
        <BanUserDialog
          email={pendingBan.email}
          username={pendingBan.username}
          onCancel={() => setPendingBan(null)}
          onConfirm={() => {
            action.mutate({
              action: "ban",
              email: pendingBan.email,
              username: pendingBan.username,
            })
          }}
          isPending={action.isPending}
        />
      ) : null}
    </div>
  )
}

function DeleteUserDialog({
  email,
  username,
  onCancel,
  onConfirm,
  isPending,
}: {
  email: string
  username: string
  onCancel: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete @{username}?</DialogTitle>
          <DialogDescription>
            This permanently deletes the account for {email}. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            Delete account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BanUserDialog({
  email,
  username,
  onCancel,
  onConfirm,
  isPending,
}: {
  email: string
  username: string
  onCancel: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban @{username}?</DialogTitle>
          <DialogDescription>
            This will ban {email} and block them from accessing the app. You can
            unban them at any time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            Ban account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BulkDialog() {
  const [open, setOpen] = useState(false)
  const [emails, setEmails] = useState("")
  const qc = useQueryClient()

  const bulk = useMutation({
    mutationFn: (action: "disable" | "enable") =>
      apiFetch<{ updated_count?: number }>("/api/zyber/users/bulk", {
        method: "POST",
        body: JSON.stringify({ action, emails }),
      }),
    onSuccess: (data, action) => {
      toast.success(
        `Bulk ${action} done. Updated ${data.updated_count ?? 0} user(s).`,
      )
      qc.invalidateQueries({ queryKey: ["zyber", "users"] })
      setOpen(false)
      setEmails("")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Bulk
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk enable / disable</DialogTitle>
          <DialogDescription>
            Paste emails separated by commas, semicolons, or new lines.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="disable">
          <TabsList>
            <TabsTrigger value="disable">Disable</TabsTrigger>
            <TabsTrigger value="enable">Enable</TabsTrigger>
          </TabsList>
          <TabsContent value="disable" className="space-y-3">
            <Textarea
              rows={6}
              placeholder="alice@example.com, bob@example.com"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
            />
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={!emails.trim() || bulk.isPending}
                onClick={() => bulk.mutate("disable")}
              >
                Disable all
              </Button>
            </DialogFooter>
          </TabsContent>
          <TabsContent value="enable" className="space-y-3">
            <Textarea
              rows={6}
              placeholder="alice@example.com, bob@example.com"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
            />
            <DialogFooter>
              <Button
                disabled={!emails.trim() || bulk.isPending}
                onClick={() => bulk.mutate("enable")}
              >
                Enable all
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function AllToggleDialog() {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<"disable" | "enable" | null>(null)
  const qc = useQueryClient()

  const all = useMutation({
    mutationFn: (action: "disable" | "enable") =>
      apiFetch<{ updated_count?: number }>("/api/zyber/users/all", {
        method: "POST",
        body: JSON.stringify({ action }),
      }),
    onSuccess: (data, action) => {
      toast.success(
        `${action === "disable" ? "Disabled" : "Enabled"} ${data.updated_count ?? 0} user(s).`,
      )
      qc.invalidateQueries({ queryKey: ["zyber", "users"] })
      setOpen(false)
      setPending(null)
    },
    onError: (err: Error) => {
      toast.error(err.message)
      setPending(null)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        All users
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Toggle every account</DialogTitle>
          <DialogDescription>
            This affects every non-admin user in the database. Use with care.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={all.isPending}
            onClick={() => {
              setPending("enable")
              all.mutate("enable")
            }}
          >
            Enable all{pending === "enable" ? "…" : ""}
          </Button>
          <Button
            variant="destructive"
            disabled={all.isPending}
            onClick={() => {
              setPending("disable")
              all.mutate("disable")
            }}
          >
            Disable all{pending === "disable" ? "…" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
