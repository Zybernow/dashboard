"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "marketing", label: "Marketing" },
  { value: "admin", label: "Admin" },
]

export function InviteForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("user")
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<
    | { kind: "success"; message: string }
    | { kind: "warning"; message: string }
    | { kind: "error"; message: string }
    | null
  >(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFeedback(null)
    setLoading(true)
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      })
      const data = await res.json().catch(() => ({})) as {
        error?: string
        emailSent?: boolean
        emailError?: string
      }
      if (!res.ok) {
        const code = data.error ?? "request_failed"
        setFeedback({ kind: "error", message: humanize(code) })
        return
      }
      if (data.emailSent) {
        setFeedback({ kind: "success", message: `Invitation sent to ${email}.` })
      } else {
        setFeedback({
          kind: "warning",
          message: `Invitation created for ${email}, but the email couldn't be sent (${
            data.emailError ?? "unknown error"
          }). They can still sign in, or you can resend from the table below.`,
        })
      }
      setEmail("")
      setRole("user")
      router.refresh()
    } catch {
      setFeedback({ kind: "error", message: "Could not send invitation." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px_auto] md:items-end"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          type="email"
          required
          placeholder="teammate@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="invite-role">Role</Label>
        <Select
          value={role}
          onValueChange={(v) => v && setRole(v)}
          disabled={loading}
        >
          <SelectTrigger id="invite-role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" size="lg" disabled={loading || !email}>
        {loading ? <Spinner /> : "Send invitation"}
      </Button>

      {feedback ? (
        <p
          className={
            "md:col-span-3 text-xs " +
            (feedback.kind === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : feedback.kind === "warning"
                ? "text-amber-600 dark:text-amber-400"
                : "text-destructive")
          }
        >
          {feedback.message}
        </p>
      ) : null}
    </form>
  )
}

function humanize(code: string) {
  switch (code) {
    case "already_invited":
      return "There's already a pending invitation for that email."
    case "invalid_email":
      return "Please enter a valid email address."
    case "invalid_role":
      return "That role isn't supported."
    case "forbidden":
      return "Only admins can send invitations."
    case "unauthorized":
      return "You need to be signed in."
    default:
      return "Could not send invitation."
  }
}
