import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * Вебхук Telegram-бота. Отвечает на /start кнопкой запуска Mini App.
 * Токен и секрет живут только в переменных окружения.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (secret) {
    const provided = req.headers.get('x-telegram-bot-api-secret-token')
    if (provided !== secret) {
      logger.warn('telegram.webhook.bad_secret')
      return NextResponse.json({ ok: false }, { status: 401 })
    }
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const appUrl = process.env.TELEGRAM_WEBAPP_URL ?? process.env.NEXT_PUBLIC_APP_URL
  if (!token || !appUrl) {
    logger.warn('telegram.webhook.not_configured')
    return NextResponse.json({ ok: true })
  }

  try {
    const update = await req.json()
    const message = update?.message
    const chatId = message?.chat?.id
    const text: string | undefined = message?.text

    if (chatId && typeof text === 'string' && text.startsWith('/start')) {
      const payload = text.split(' ')[1]?.trim()
      const url = payload ? `${appUrl}?startapp=${encodeURIComponent(payload)}` : appUrl

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: 'MYSS — библиотека практического опыта выдающихся людей. Открой приложение и выбери, чей подход разобрать.',
          reply_markup: {
            inline_keyboard: [[{ text: 'Открыть MYSS', web_app: { url } }]],
          },
        }),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('telegram.webhook.failed', error)
    return NextResponse.json({ ok: true })
  }
}
