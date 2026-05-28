"use client"

import type { ColumnDef } from "@tanstack/react-table"
import {
  BadgeCheckIcon,
  BanIcon,
  CheckIcon,
  ShieldCheckIcon,
  ShieldXIcon,
  Trash2Icon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { AdminUser } from "@/lib/zyber-types"

export type UserActionInput = {
  action: "disable" | "enable" | "delete" | "ban" | "unban"
  email: string
  username: string
}

export type SortKey = "created_at" | "username" | "email" | "first_name"

type ColumnContext = {
  sort: SortKey
  order: "asc" | "desc"
  onSort: (key: SortKey) => void
  isMutating: boolean
  onAction: (input: UserActionInput) => void
}

export function buildUserColumns(ctx: ColumnContext): ColumnDef<AdminUser>[] {
  const sortFor = (key: SortKey): "asc" | "desc" | null =>
    ctx.sort === key ? ctx.order : null
  const onSortFor = (key: SortKey) => () => ctx.onSort(key)

  return [
    {
      id: "username",
      accessorKey: "username",
      size: 150,
      minSize: 90,
      maxSize: 320,
      header: () => (
        <DataTableColumnHeader
          title="Username"
          canSort
          sort={sortFor("username")}
          onSort={onSortFor("username")}
        />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs">@{row.original.username}</span>
      ),
      meta: { label: "Username" },
    },
    {
      id: "name",
      accessorFn: (u) =>
        [u.first_name, u.last_name].filter(Boolean).join(" "),
      size: 180,
      minSize: 100,
      maxSize: 360,
      header: () => (
        <DataTableColumnHeader
          title="Name"
          canSort
          sort={sortFor("first_name")}
          onSort={onSortFor("first_name")}
        />
      ),
      cell: ({ row }) => {
        const full = [row.original.first_name, row.original.last_name]
          .filter(Boolean)
          .join(" ")
        return <span className="font-medium">{full || "—"}</span>
      },
      meta: { label: "Name" },
    },
    {
      id: "email",
      accessorKey: "email",
      size: 220,
      minSize: 120,
      maxSize: 420,
      header: () => (
        <DataTableColumnHeader
          title="Email"
          canSort
          sort={sortFor("email")}
          onSort={onSortFor("email")}
        />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email}</span>
      ),
      meta: { label: "Email" },
    },
    {
      id: "college",
      accessorKey: "college",
      size: 180,
      minSize: 100,
      maxSize: 360,
      header: () => <DataTableColumnHeader title="College" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.college || "—"}
        </span>
      ),
      meta: { label: "College" },
    },
    {
      id: "state",
      size: 130,
      minSize: 110,
      maxSize: 200,
      header: () => <DataTableColumnHeader title="State" />,
      cell: ({ row }) => {
        const u = row.original
        const verifiedIcon = u.work_email_verified ? (
          <BadgeCheckIcon
            aria-label="Work email verified"
            className="size-3.5"
          />
        ) : null

        if (u.is_banned) {
          return (
            <Badge variant="destructive">
              Banned
              {verifiedIcon}
            </Badge>
          )
        }
        if (!u.is_active) {
          return (
            <Badge variant="secondary">
              Disabled
              {verifiedIcon}
            </Badge>
          )
        }
        if (u.work_email_verified) {
          return (
            <Badge>
              Active
              {verifiedIcon}
            </Badge>
          )
        }
        return (
          <Badge
            variant="outline"
            className="border-primary/40 bg-primary/10 text-primary"
          >
            Active
          </Badge>
        )
      },
      enableHiding: true,
      meta: { label: "State" },
    },
    {
      id: "onboarding",
      accessorKey: "is_onboarding_complete",
      size: 120,
      minSize: 100,
      maxSize: 180,
      header: () => <DataTableColumnHeader title="Onboarding" />,
      cell: ({ row }) =>
        row.original.is_onboarding_complete ? (
          <Badge
            variant="outline"
            className="border-primary/40 bg-primary/10 text-primary"
          >
            Complete
          </Badge>
        ) : (
          <Badge variant="secondary">Pending</Badge>
        ),
      enableHiding: true,
      meta: { label: "Onboarding" },
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      size: 110,
      minSize: 100,
      maxSize: 180,
      header: () => (
        <DataTableColumnHeader
          title="Joined"
          canSort
          sort={sortFor("created_at")}
          onSort={onSortFor("created_at")}
        />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
      enableHiding: true,
      meta: { label: "Joined" },
    },
    {
      id: "actions",
      size: 100,
      minSize: 100,
      maxSize: 100,
      enableHiding: false,
      enableResizing: false,
      header: () => <span className="text-foreground">Actions</span>,
      meta: { label: "Actions", truncate: false },
      cell: ({ row }) => {
        const u = row.original
        const toggleAction = u.is_active ? "disable" : "enable"
        const ToggleIcon = u.is_active ? BanIcon : CheckIcon
        const toggleLabel = u.is_active ? "Disable user" : "Enable user"
        const banAction = u.is_banned ? "unban" : "ban"
        const BanToggleIcon = u.is_banned ? ShieldCheckIcon : ShieldXIcon
        const banLabel = u.is_banned ? "Unban user" : "Ban user"
        return (
          <div className="flex justify-end gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={toggleLabel}
                    disabled={ctx.isMutating}
                    onClick={() =>
                      ctx.onAction({
                        action: toggleAction,
                        email: u.email,
                        username: u.username,
                      })
                    }
                  >
                    <ToggleIcon />
                  </Button>
                }
              />
              <TooltipContent>{toggleLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={banLabel}
                    disabled={ctx.isMutating}
                    className={
                      u.is_banned
                        ? undefined
                        : "text-destructive hover:bg-destructive/10 hover:text-destructive"
                    }
                    onClick={() =>
                      ctx.onAction({
                        action: banAction,
                        email: u.email,
                        username: u.username,
                      })
                    }
                  >
                    <BanToggleIcon />
                  </Button>
                }
              />
              <TooltipContent>{banLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Delete user"
                    disabled={ctx.isMutating}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      ctx.onAction({
                        action: "delete",
                        email: u.email,
                        username: u.username,
                      })
                    }
                  >
                    <Trash2Icon />
                  </Button>
                }
              />
              <TooltipContent>Delete user</TooltipContent>
            </Tooltip>
          </div>
        )
      },
    },
  ]
}
