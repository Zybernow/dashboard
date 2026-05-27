import {
  ActivityIcon,
  CalendarIcon,
  DatabaseIcon,
  FlagIcon,
  GaugeIcon,
  HardDriveIcon,
  MailPlusIcon,
  ScrollIcon,
  ShieldIcon,
  Trash2Icon,
  UserCogIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react"
import type { DashboardSection } from "@/lib/permissions"

export type NavItem = {
  section: DashboardSection
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { section: "telemetry", href: "/", label: "Telemetry", icon: GaugeIcon },
      { section: "live", href: "/live", label: "Live users", icon: ActivityIcon },
    ],
  },
  {
    label: "Moderation",
    items: [
      { section: "users", href: "/users", label: "Users", icon: UsersIcon },
      { section: "reports", href: "/reports", label: "Reports", icon: FlagIcon },
      {
        section: "deletion-requests",
        href: "/deletion-requests",
        label: "Deletion requests",
        icon: Trash2Icon,
      },
      {
        section: "work-email",
        href: "/work-email",
        label: "Work email",
        icon: ShieldIcon,
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        section: "communities",
        href: "/communities",
        label: "Communities",
        icon: UsersRoundIcon,
      },
      { section: "events", href: "/events", label: "Events", icon: CalendarIcon },
    ],
  },
  {
    label: "Operations",
    items: [
      { section: "logs", href: "/logs", label: "Logs", icon: ScrollIcon },
      {
        section: "maintainers",
        href: "/maintainers",
        label: "Maintainers",
        icon: UserCogIcon,
      },
      { section: "version", href: "/version", label: "Version", icon: HardDriveIcon },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        section: "invitations",
        href: "/invitations",
        label: "Invitations",
        icon: MailPlusIcon,
      },
      {
        section: "sql-explorer",
        href: "/sql-explorer",
        label: "SQL Explorer",
        icon: DatabaseIcon,
      },
    ],
  },
]

export type NavMeta = {
  group: NavGroup
  item: NavItem
}

export function findNavMeta(pathname: string): NavMeta | null {
  const normalized = pathname === "/" ? "/" : pathname.replace(/\/+$/, "")
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (normalized === item.href) return { group, item }
    }
  }
  // Match deepest prefix for nested routes (e.g. /users/alice → /users).
  let best: NavMeta | null = null
  let bestLen = 0
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.href === "/") continue
      if (
        normalized.startsWith(item.href) &&
        (normalized[item.href.length] === "/" ||
          normalized.length === item.href.length) &&
        item.href.length > bestLen
      ) {
        best = { group, item }
        bestLen = item.href.length
      }
    }
  }
  return best
}
