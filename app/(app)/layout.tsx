import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getMaintainerSession } from "@/lib/maintainer-session"
import { AppSidebar } from "@/components/app-sidebar"
import { ClientOnly } from "@/components/client-only"
import { Header } from "@/components/header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { Role } from "@/lib/permissions"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Run both auth checks in parallel — for Better Auth users getMaintainerSession
  // returns null immediately (no cookie), so no extra cost; for maintainer users
  // this avoids waiting for Better Auth to complete before starting the JWT check.
  const headersList = await headers()
  const [session, maintainer] = await Promise.all([
    auth.api.getSession({ headers: headersList }).catch(() => null),
    getMaintainerSession().catch(() => null),
  ])

  let role: Role | "maintainer" | undefined
  let user: { name: string; email: string; image: string | null }

  if (session) {
    role = session.user.role as Role | undefined
    user = {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    }
  } else if (maintainer) {
    role = "maintainer"
    user = {
      name: maintainer.username,
      email: "",
      image: null,
    }
  } else {
    redirect("/sign-in")
  }

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <ClientOnly
          fallback={
            <div
              aria-hidden
              className="hidden md:block w-(--sidebar-width) shrink-0"
            />
          }
        >
          <AppSidebar role={role} user={user} />
        </ClientOnly>
        <SidebarInset>
          <ClientOnly
            fallback={
              <div
                aria-hidden
                className="h-14 shrink-0 border-b"
              />
            }
          >
            <Header isMaintainer={role === "maintainer"} />
          </ClientOnly>
          <ScrollArea className="flex-1">
            <div className="px-4 py-4 sm:px-8 sm:py-8">
              <div className="w-full">{children}</div>
            </div>
          </ScrollArea>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
