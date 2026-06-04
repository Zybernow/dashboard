"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { canAccess, type Role } from "@/lib/permissions"
import { NAV_GROUPS } from "@/lib/nav"
import { cn } from "@/lib/utils"

export function AppSidebar({
  role,
  user,
}: {
  role?: Role | "maintainer"
  user: { name: string; email: string; image: string | null }
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccess(role, item.section)),
    })).filter((group) => group.items.length > 0)
  }, [role])

  const prefetchHrefs = useMemo(
    () => visibleGroups.flatMap((group) => group.items.map((item) => item.href)),
    [visibleGroups],
  )

  useEffect(() => {
    prefetchHrefs.forEach((href) => router.prefetch(href))
  }, [router, prefetchHrefs])

  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  const handleNavClick = (href: string) => (event: React.MouseEvent) => {
    if (event.defaultPrevented) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (event.button !== 0) return
    event.preventDefault()
    setPendingHref(href)
    startTransition(() => router.push(href))
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Zyber"
              render={<Link href="/" />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
                Z
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Zyber</span>
                <span className="truncate text-xs capitalize text-muted-foreground">
                  {role ?? "user"} workspace
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href))
                  const Icon = item.icon
                  const isPending = pendingHref === item.href && pathname !== item.href
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        tooltip={item.label}
                        isActive={active}
                        className={cn(isPending && "cursor-wait opacity-70")}
                        aria-busy={isPending || undefined}
                        data-pending={isPending ? "true" : undefined}
                        render={
                          <Link
                            href={item.href}
                            prefetch
                            onClick={handleNavClick(item.href)}
                          />
                        }
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenuButton user={user} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

function UserMenuButton({
  user,
}: {
  user: { name: string; email: string; image: string | null }
}) {
  const { state } = useSidebar()
  const tooltip = state === "collapsed" ? `${user.name} (${user.email})` : undefined

  return (
    <SidebarMenuButton size="lg" tooltip={tooltip} className="cursor-default">
      <Avatar src={user.image} name={user.name} />
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{user.name}</span>
        <span className="truncate text-xs text-muted-foreground">{user.email}</span>
      </div>
    </SidebarMenuButton>
  )
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  const [errored, setErrored] = useState(false)
  const initial = name.slice(0, 1).toUpperCase()

  if (!src || errored) {
    return (
      <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium">
        {initial}
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={name}
      width={32}
      height={32}
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className="aspect-square size-8 shrink-0 rounded-full object-cover"
    />
  )
}
