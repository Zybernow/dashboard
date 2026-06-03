export const ROLES = ["admin", "marketing", "user"] as const
export type Role = (typeof ROLES)[number]

export type DashboardSection =
  | "telemetry"
  | "users"
  | "live"
  | "work-email"
  | "deletion-requests"
  | "reports"
  | "communities"
  | "events"
  | "logs"
  | "maintainers"
  | "version"
  | "invitations"
  | "sql-explorer"
  | "announcements"
  | "support-staff"
  | "notifications"
  | "analytics-overview"
  | "analytics-funnel"
  | "analytics-match-intelligence"
  | "analytics-user-cohorts"

const ALL_ADMIN: DashboardSection[] = [
  "telemetry",
  "users",
  "live",
  "work-email",
  "deletion-requests",
  "reports",
  "communities",
  "events",
  "logs",
  "maintainers",
  "version",
  "invitations",
  "sql-explorer",
  "announcements",
  "support-staff",
  "notifications",
  "analytics-overview",
  "analytics-funnel",
  "analytics-match-intelligence",
  "analytics-user-cohorts",
]

const MAINTAINER_SECTIONS: DashboardSection[] = [
  "work-email",
  "users",
  "communities",
  "events",
  "reports",
]

const ACCESS: Record<Role, DashboardSection[]> = {
  admin: ALL_ADMIN,
  marketing: ["telemetry", "analytics-overview", "analytics-funnel", "analytics-match-intelligence", "analytics-user-cohorts"],
  user: [],
}

export function canAccess(
  role: Role | "maintainer" | string | null | undefined,
  section: DashboardSection,
): boolean {
  if (!role) return false
  if (role === "maintainer") return MAINTAINER_SECTIONS.includes(section)
  const allowed = ACCESS[role as Role]
  return Array.isArray(allowed) && allowed.includes(section)
}

export function landingSectionFor(
  role: Role | "maintainer" | string | null | undefined,
): DashboardSection | null {
  if (!role) return null
  if (role === "admin") return "telemetry"
  if (role === "marketing") return "telemetry"
  if (role === "maintainer") return "work-email"
  return null
}

export function isAdmin(role: Role | string | null | undefined): boolean {
  return role === "admin"
}
