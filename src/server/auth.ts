import { NextRequest } from 'next/server'
import type { User } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validateInitData } from './telegram/initData'

export const INIT_DATA_HEADER = 'x-telegram-init-data'

export class AuthError extends Error {
  constructor(
    public readonly reason: string,
    public readonly status = 401,
  ) {
    super(reason)
  }
}

function adminTelegramIds(): Set<bigint> {
  const raw = process.env.ADMIN_TELEGRAM_IDS ?? ''
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const out = new Set<bigint>()
  for (const id of ids) {
    try {
      out.add(BigInt(id))
    } catch {
      /* игнорируем некорректные значения конфигурации */
    }
  }
  return out
}

/**
 * Возвращает пользователя по проверенной подписи Telegram.
 * user_id, присланный клиентом напрямую, никогда не используется.
 */
export async function requireUser(req: NextRequest): Promise<User> {
  const initData = req.headers.get(INIT_DATA_HEADER)
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  // Локальная разработка вне Telegram: только при явном флаге и не в production.
  if (
    !initData &&
    process.env.ALLOW_DEV_AUTH === 'true' &&
    process.env.NODE_ENV !== 'production'
  ) {
    return upsertUser({
      id: 1,
      first_name: 'Local',
      username: 'local_dev',
    })
  }

  const result = validateInitData(initData, botToken)
  if (!result.ok) {
    logger.warn('auth.rejected', { reason: result.reason })
    throw new AuthError(result.reason)
  }

  return upsertUser(result.data.user!)
}

export async function optionalUser(req: NextRequest): Promise<User | null> {
  try {
    return await requireUser(req)
  } catch {
    return null
  }
}

export async function requireAdmin(req: NextRequest): Promise<User> {
  // Путь 1: серверный секрет (для скриптов и импорта).
  const secret = req.headers.get('x-admin-secret')
  const configured = process.env.ADMIN_SECRET
  if (secret && configured && safeEqual(secret, configured)) {
    const user = await optionalUser(req)
    if (user) return user
    throw new AuthError('admin_secret_requires_user', 401)
  }

  // Путь 2: Telegram-пользователь из списка администраторов.
  const user = await requireUser(req)
  if (user.isAdmin) return user

  logger.warn('admin.forbidden', { userId: user.id })
  throw new AuthError('forbidden', 403)
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function upsertUser(tg: {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}): Promise<User> {
  const telegramId = BigInt(tg.id)
  const isAdmin = adminTelegramIds().has(telegramId)
  const data = {
    username: tg.username ?? null,
    firstName: tg.first_name ?? null,
    lastName: tg.last_name ?? null,
    photoUrl: tg.photo_url ?? null,
    languageCode: tg.language_code ?? null,
    isAdmin,
    lastSeenAt: new Date(),
  }
  return prisma.user.upsert({
    where: { telegramId },
    create: { telegramId, ...data },
    update: data,
  })
}
