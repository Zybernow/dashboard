"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const LABELS: Record<string, string> = {
  "": "Overview",
  notifications: "Notifications",
  users: "Users",
  invitations: "Invitations",
  settings: "Settings",
}

function labelFor(segment: string) {
  if (segment in LABELS) return LABELS[segment]
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  const crumbs =
    segments.length === 0
      ? [{ href: "/", label: "Overview", isCurrent: true }]
      : [
          { href: "/", label: "Overview", isCurrent: false },
          ...segments.map((seg, i) => ({
            href: "/" + segments.slice(0, i + 1).join("/"),
            label: labelFor(seg),
            isCurrent: i === segments.length - 1,
          })),
        ]

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="contents">
            <BreadcrumbItem>
              {crumb.isCurrent ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link href={crumb.href} />}>
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {i < crumbs.length - 1 ? <BreadcrumbSeparator /> : null}
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
