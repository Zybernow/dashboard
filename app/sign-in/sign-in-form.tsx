"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"

export default function SignInForm({ initialError }: { initialError?: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">Welcome to Zyber</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to continue to your dashboard.
          </p>
        </div>

        <Tabs defaultValue="team">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="team" className="flex-1">Team</TabsTrigger>
            <TabsTrigger value="maintainer" className="flex-1">Maintainer</TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <TeamSignIn initialError={initialError} />
          </TabsContent>

          <TabsContent value="maintainer">
            <MaintainerSignIn />
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our terms and privacy policy.
        </p>
      </div>
    </div>
  )
}

function TeamSignIn({ initialError }: { initialError?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError ?? null)

  async function handleGoogle() {
    setError(null)
    setLoading(true)
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/sign-in",
    })
    if (error) {
      setError(error.message ?? "Could not sign in with Google.")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        size="lg"
        className="w-full flex items-center justify-center"
        disabled={loading}
        onClick={handleGoogle}
      >
        {!loading && (
          <Image
            src="/google.svg"
            alt="google icon"
            width={16}
            height={16}
            className="mr-2"
          />
        )}
        <span>{loading ? "Please wait" : "Continue with Google"}</span>
        {loading && <Spinner className="ml-2" />}
      </Button>

      {error ? (
        <p className="text-center text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  )
}

function MaintainerSignIn() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/auth/maintainer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      if (res.ok) {
        router.push("/work-email")
        return
      }

      const data = (await res.json().catch(() => null)) as {
        error?: string
      } | null
      setError(data?.error ?? "Invalid username or password.")
    } catch {
      setError("Could not reach the server. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          autoComplete="username"
          placeholder="your-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={loading || !username || !password}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            Please wait <Spinner />
          </span>
        ) : (
          "Sign in"
        )}
      </Button>

      {error ? (
        <p className="text-center text-xs text-destructive">{error}</p>
      ) : null}
    </form>
  )
}
