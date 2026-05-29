import "./globals.css"
import type { Metadata, Viewport } from "next"
import { Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { Toaster } from "@/components/ui/sonner"
import { PwaRegister } from "@/components/pwa-register"

export const metadata: Metadata = {
  title: "Zyber Dashboard",
  description: "Zyber organization dashboard",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Zyber",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f0fc" },
    { media: "(prefers-color-scheme: dark)", color: "#1a0a29" },
  ],
  width: "device-width",
  initialScale: 1,
}

// Single load with all three variable bindings — avoids fetching the same
// font file three times when --font-sans, --font-serif, and --font-mono all
// resolve to Space Grotesk.
const font = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body className={`${font.variable} antialiased`}>
        <ThemeProvider>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  )
}
