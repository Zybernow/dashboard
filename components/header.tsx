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
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { SignOutButton } from "@/components/sign-out-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { findNavMeta } from "@/lib/nav"

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Separator
          orientation="vertical"
          className="data-vertical:h-4 data-vertical:self-center mx-1"
        />
        <HeaderBreadcrumb />
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  )
}

function HeaderBreadcrumb() {
  const pathname = usePathname()
  const meta = findNavMeta(pathname)

  // Unknown route: show pathname as a single crumb.
  if (!meta) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{pathname}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  const { group, item } = meta
  const segments = pathname.split("/").filter(Boolean)
  const itemSegments = item.href.split("/").filter(Boolean)
  const trailing = segments.slice(itemSegments.length)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="text-muted-foreground">
          {group.label}
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {trailing.length === 0 ? (
            <BreadcrumbPage>{item.label}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink render={<Link href={item.href} />}>
              {item.label}
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {trailing.map((seg, i) => {
          const href =
            "/" + segments.slice(0, itemSegments.length + i + 1).join("/")
          const isLast = i === trailing.length - 1
          const label = decodeURIComponent(seg)
          return (
            <span key={href} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={href} />}>
                    {label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
