"use client"

import Image from "next/image"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export default function SignInForm({ initialError }: { initialError?: string }) {
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
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">Welcome to Zyber</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to continue to your dashboard.
          </p>
        </div>

        <Button
          variant="outline"
          size="lg"
          className="w-full flex items-center justify-center"
          disabled={loading}
          onClick={handleGoogle}
        >
          {!loading && <Image src="/google.svg" alt="google icon" width={16} height={16} className="mr-2" />}
          <span>{loading ? "Please wait" : "Continue with Google"}</span>
          {loading && <Spinner className="ml-2" />}
        </Button>

        {error ? (
          <p className="mt-4 text-center text-xs text-destructive">{error}</p>
        ) : null}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our terms and privacy policy.
        </p>
      </div>
    </div>
  )
}
