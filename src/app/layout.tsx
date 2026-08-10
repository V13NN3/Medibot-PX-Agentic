import type { Metadata } from "next"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Geist, Geist_Mono } from "next/font/google"
import { Menu } from "@/components/ui/menu"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const VoiceButton = dynamic(
  () => import("@/components/voice/voice-button").then((m) => ({ default: m.VoiceButton })),
)

const QueueMonitor = dynamic(
  () => import("@/components/queue-monitor").then((m) => ({ default: m.QueueMonitor })),
)

export const metadata: Metadata = {
  title: "Medibot PX",
  description: "Healthcare Assistant Robot OS",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-app-bg text-foreground" suppressHydrationWarning>
        <header className="h-10 bg-status-bar flex items-center justify-between px-4 text-status-text text-xs font-mono shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-[11px] font-semibold uppercase tracking-wider text-white/60 hover:text-white transition-colors"
            >
              Home
            </Link>
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="font-semibold uppercase tracking-wider">Idle</span>
          </div>
          <span className="text-[10px] text-white/40">Medibot PX v0.1.0</span>
          <Menu />
        </header>

        <main className="flex-1 flex flex-col overflow-auto">
          {children}
        </main>

        <VoiceButton />
        <QueueMonitor />
      </body>
    </html>
  )
}
