import type { Metadata, Viewport } from "next"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Geist, Geist_Mono } from "next/font/google"
import { Menu } from "@/components/ui/menu"
import { MenuProvider } from "@/components/ui/menu-context"
import { KioskFit } from "@/components/kiosk-fit"
import { VoiceEngineProvider } from "@/components/voice/voice-engine"
import "./globals.css"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content",
}

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

const NewPatientFill = dynamic(
  () => import("@/components/new-patient-fill").then((m) => ({ default: m.NewPatientFill })),
)

const FullscreenGate = dynamic(
  () => import("@/components/fullscreen-gate").then((m) => ({ default: m.FullscreenGate })),
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
      className={`${geistSans.variable} ${geistMono.variable} h-dvh antialiased`}
    >
      <body className="h-dvh flex flex-col bg-app-bg text-foreground overflow-hidden" suppressHydrationWarning>
        <KioskFit>
          <MenuProvider>
            <VoiceEngineProvider>
              <header className="h-12 bg-status-bar flex items-center justify-between px-4 text-status-text text-xs font-mono shrink-0 touch-manipulation">
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

              <main className="flex-1 flex flex-col overflow-hidden">
                {children}
              </main>

              <VoiceButton compact />
              <QueueMonitor />
              <NewPatientFill />
              <FullscreenGate />
            </VoiceEngineProvider>
          </MenuProvider>
        </KioskFit>
      </body>
    </html>
  )
}
