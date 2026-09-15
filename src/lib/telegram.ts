'use client'

/** Минимальная типизация Telegram WebApp API, без внешних зависимостей. */
export interface TelegramWebApp {
  initData: string
  initDataUnsafe?: {
    user?: {
      id: number
      first_name?: string
      last_name?: string
      username?: string
      photo_url?: string
    }
    start_param?: string
  }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: Record<string, string>
  isExpanded: boolean
  viewportHeight: number
  safeAreaInset?: { top: number; bottom: number; left: number; right: number }
  ready: () => void
  expand: () => void
  close: () => void
  openTelegramLink: (url: string) => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  disableVerticalSwipes?: () => void
  BackButton: {
    isVisible: boolean
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
  }
  MainButton: {
    text: string
    isVisible: boolean
    show: () => void
    hide: () => void
    setText: (text: string) => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
    enable: () => void
    disable: () => void
    showProgress: (leaveActive?: boolean) => void
    hideProgress: () => void
  }
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

export function tg(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  return window.Telegram?.WebApp ?? null
}

export function initData(): string {
  return tg()?.initData ?? ''
}

export const haptic = {
  tap() {
    tg()?.HapticFeedback?.impactOccurred('light')
  },
  select() {
    tg()?.HapticFeedback?.selectionChanged()
  },
  success() {
    tg()?.HapticFeedback?.notificationOccurred('success')
  },
  warning() {
    tg()?.HapticFeedback?.notificationOccurred('warning')
  },
}

/** Общий клиент API: подписанные данные Telegram уходят в заголовке. */
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('content-type', 'application/json')
  const data = initData()
  if (data) headers.set('x-telegram-init-data', data)

  const res = await fetch(path, { ...options, headers })
  if (!res.ok) {
    let message = 'Не получилось загрузить данные. Попробуй ещё раз.'
    try {
      const body = await res.json()
      if (body?.error?.message) message = body.error.message
    } catch {
      /* тело ответа может быть пустым */
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}
