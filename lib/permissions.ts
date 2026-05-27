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
]

const ACCESS: Record<Role, DashboardSection[]> = {
  admin: ALL_ADMIN,
  marketing: ["telemetry"],
  user: [],
}

export function canAccess(
  role: Role | string | null | undefined,
  section: DashboardSection,
): boolean {
  if (!role) return false
  const allowed = ACCESS[role as Role]
  return Array.isArray(allowed) && allowed.includes(section)
}

export function landingSectionFor(
  role: Role | string | null | undefined,
): DashboardSection | null {
  if (!role) return null
  if (role === "admin") return "telemetry"
  if (role === "marketing") return "telemetry"
  return null
}

export function isAdmin(role: Role | string | null | undefined): boolean {
  return role === "admin"
}
