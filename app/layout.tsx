import "./globals.css"
import { Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider"

const fontSans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontSerif = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-serif",
});

const fontMono = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-mono",
});

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
      <body className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}

