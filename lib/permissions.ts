export const ROLES = ["admin", "marketing", "user"] as const
export type Role = (typeof ROLES)[number]

export type DashboardSection =
  | "overview"
  | "notifications"
  | "users"
  | "invitations"
  | "settings"

const ACCESS: Record<Role, DashboardSection[]> = {
  admin: ["overview", "notifications", "users", "invitations", "settings"],
  marketing: ["notifications"],
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

export function landingSectionFor(role: Role | string | null | undefined):
  | DashboardSection
  | null {
  if (!role) return null
  if (role === "admin") return "overview"
  if (role === "marketing") return "notifications"
  return null
}

export function isAdmin(role: Role | string | null | undefined): boolean {
  return role === "admin"
}
