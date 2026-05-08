import SignInForm from "./sign-in-form"

const ERROR_MESSAGES: Record<string, string> = {
  email_not_allowed:
    "You are not authorized to access this application. Please contact your administrator to send an invitation.",
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const initialError = error
    ? ERROR_MESSAGES[error] ?? "Sign in failed! Please try again."
    : undefined

  return <SignInForm initialError={initialError} />
}
