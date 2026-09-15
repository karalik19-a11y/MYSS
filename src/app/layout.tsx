import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import { TelegramProvider } from '@/components/TelegramProvider'
import { BottomNav } from '@/components/BottomNav'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'MYSS — Make Yourself Super Smart',
    template: '%s — MYSS',
  },
  description:
    'Собрали самое полезное из опыта людей, которые делали это по-настоящему: принципы, решения, ошибки и то, что можно применить сегодня.',
  applicationName: 'MYSS',
  openGraph: {
    type: 'website',
    siteName: 'MYSS',
    title: 'MYSS — Make Yourself Super Smart',
    description:
      'Библиотека практического опыта выдающихся людей: как они работали, что решали и на чём ошибались.',
    locale: 'ru_RU',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#08090c',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-dvh bg-[var(--bg)] text-bone-50 antialiased">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <TelegramProvider>
          <div
            className="pb-[calc(var(--nav-height)+var(--safe-bottom)+8px)]"
            style={{ paddingTop: 'var(--safe-top)' }}
          >
            {children}
          </div>
          <BottomNav />
        </TelegramProvider>
      </body>
    </html>
  )
}
