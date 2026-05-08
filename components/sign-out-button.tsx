"use client"

import { useRouter } from "next/navigation"
import { LogOutIcon } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/sign-in") },
    })
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Sign out"
            onClick={handleSignOut}
          >
            <LogOutIcon />
          </Button>
        }
      />
      <TooltipContent>Sign out</TooltipContent>
    </Tooltip>
  )
}
