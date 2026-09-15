import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AuthError } from './auth'
import { logger } from '@/lib/logger'

/** BigInt не сериализуется в JSON — приводим к строке. */
function normalize(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = normalize(v)
    return out
  }
  return value
}

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(normalize(data) as object, init)
}

export function fail(message: string, status: number, code?: string) {
  return NextResponse.json({ error: { message, code } }, { status })
}

/**
 * Единая обработка ошибок: наружу — человеческий текст, детали — в логи.
 * Stack trace никогда не попадает в ответ.
 */
export function handleError(scope: string, error: unknown) {
  if (error instanceof AuthError) {
    const message =
      error.status === 403
        ? 'Нет доступа к этому разделу.'
        : 'Не удалось подтвердить вход. Открой приложение через Telegram.'
    return fail(message, error.status, error.reason)
  }
  if (error instanceof ZodError) {
    logger.warn(`${scope}.validation`, { issues: error.issues.length })
    return fail('Проверь введённые данные и попробуй ещё раз.', 400, 'invalid_input')
  }
  logger.error(`${scope}.failed`, error)
  return fail('Что-то пошло не так. Попробуй ещё раз.', 500, 'internal_error')
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    throw new ZodError([])
  }
}
