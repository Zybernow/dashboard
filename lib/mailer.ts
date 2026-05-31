import "server-only"

import nodemailer, { type Transporter } from "nodemailer"

// Env var names mirror the Go backend's SMTP config (internal/services/email_otp.go)
// so the dashboard and the main app can share one set of credentials.
const HOST = process.env.SMTP_HOST?.trim() || "smtp.gmail.com"
const PORT = Number(process.env.SMTP_PORT?.trim() || "587")
const USER = (process.env.EMAIL_USER || process.env.SMTP_USERNAME || "").trim()
const PASS = (process.env.EMAIL_PASS || process.env.SMTP_PASSWORD || "").trim()
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL?.trim() || USER
const FROM_NAME = process.env.SMTP_FROM_NAME?.trim() || ""
// Implicit TLS only on port 465; 587 uses STARTTLS (secure:false), like the Go backend.
const SECURE = process.env.SMTP_SECURE === "true" || PORT === 465

const FROM = FROM_NAME ? `${FROM_NAME} <${FROM_EMAIL}>` : FROM_EMAIL

let transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (!USER || !PASS) {
    throw new Error("SMTP not configured (EMAIL_USER / EMAIL_PASS missing)")
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: SECURE,
      auth: { user: USER, pass: PASS },
    })
  }
  return transporter
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  marketing: "Marketing",
  user: "User",
}

export async function sendInvitationEmail({
  email,
  role,
}: {
  email: string
  role: string
}): Promise<void> {
  const transport = getTransporter()
  const baseUrl = (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")
  const signInUrl = `${baseUrl}/sign-in`
  const roleLabel = ROLE_LABELS[role] ?? role

  const text = [
    `You've been granted access to the Zyber Dashboard.`,
    ``,
    `Role: ${roleLabel}`,
    ``,
    `Sign in with your Google account at:`,
    signInUrl,
    ``,
    `Use the same email address this invitation was sent to (${email}).`,
  ].join("\n")

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;color:#111">
      <h2 style="margin:0 0 16px">You've been granted access to the Zyber Dashboard</h2>
      <p style="margin:0 0 8px">You can now sign in with your Google account.</p>
      <p style="margin:0 0 16px"><strong>Role:</strong> ${roleLabel}</p>
      <p style="margin:0 0 24px">
        <a href="${signInUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">Sign in to the dashboard</a>
      </p>
      <p style="margin:0;color:#666;font-size:13px">Use the same email address this invitation was sent to (${email}).</p>
    </div>
  `.trim()

  await transport.sendMail({
    from: FROM,
    to: email,
    subject: "You've been granted access to the Zyber Dashboard",
    text,
    html,
  })
}
