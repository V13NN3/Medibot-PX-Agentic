import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

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
      <body className="min-h-full flex flex-col bg-app-bg text-foreground">
        <header className="h-10 bg-status-bar flex items-center justify-between px-4 text-status-text text-xs font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="font-semibold uppercase tracking-wider">Idle</span>
          </div>
          <span className="text-[10px] text-status-text/60">Medibot PX v0.1.0</span>
        </header>

        <main className="flex-1 flex flex-col overflow-auto">
          {children}
        </main>

        <nav className="h-16 bg-card border-t border-gray-200 dark:border-gray-800 flex items-center justify-around px-2 shrink-0">
          <span className="text-[10px] text-gray-400">Apps</span>
          <span className="text-[10px] text-gray-400">Home</span>
          <span className="text-[10px] text-gray-400">Settings</span>
        </nav>
      </body>
    </html>
  )
}
