'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { tg, type TelegramWebApp } from '@/lib/telegram'

interface Ctx {
  webApp: TelegramWebApp | null
  ready: boolean
  user: { id: number; firstName?: string; photoUrl?: string } | null
}

const TelegramContext = createContext<Ctx>({ webApp: null, ready: false, user: null })

export const useTelegram = () => useContext(TelegramContext)

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Ctx>({ webApp: null, ready: false, user: null })
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const app = tg()
    if (!app) {
      setState({ webApp: null, ready: true, user: null })
      return
    }

    app.ready()
    app.expand()
    app.setHeaderColor?.('#08090c')
    app.setBackgroundColor?.('#08090c')
    app.disableVerticalSwipes?.()

    const u = app.initDataUnsafe?.user
    setState({
      webApp: app,
      ready: true,
      user: u ? { id: u.id, firstName: u.first_name, photoUrl: u.photo_url } : null,
    })

    // Диплинк: startapp=<slug> открывает страницу человека (§47).
    const startParam = app.initDataUnsafe?.start_param
    if (startParam && /^[a-z0-9-]+$/.test(startParam) && pathname === '/') {
      router.push(`/people/${startParam}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Кнопка «Назад» Telegram (§22)
  useEffect(() => {
    const app = state.webApp
    if (!app) return

    const isRoot = ['/', '/people', '/day', '/saved', '/profile'].includes(pathname)
    const handler = () => router.back()

    if (isRoot) {
      app.BackButton.hide()
    } else {
      app.BackButton.show()
      app.BackButton.onClick(handler)
    }
    return () => app.BackButton.offClick(handler)
  }, [pathname, state.webApp, router])

  return <TelegramContext.Provider value={state}>{children}</TelegramContext.Provider>
}
