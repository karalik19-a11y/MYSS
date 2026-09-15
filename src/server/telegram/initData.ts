import crypto from 'node:crypto'

export interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
  is_premium?: boolean
}

export interface ParsedInitData {
  user?: TelegramUser
  authDate: number
  queryId?: string
  startParam?: string
  raw: Record<string, string>
}

export type ValidationResult =
  | { ok: true; data: ParsedInitData }
  | { ok: false; reason: ValidationFailure }

export type ValidationFailure =
  | 'missing_init_data'
  | 'missing_bot_token'
  | 'missing_hash'
  | 'bad_signature'
  | 'expired'
  | 'missing_user'
  | 'malformed'

/** Время жизни initData по умолчанию — 24 часа. */
export const DEFAULT_MAX_AGE_SECONDS = 86_400

/**
 * Проверка подлинности Telegram WebApp initData.
 * Алгоритм: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * secret_key = HMAC_SHA256(key="WebAppData", data=bot_token)
 * hash       = HMAC_SHA256(key=secret_key, data=data_check_string)
 */
export function validateInitData(
  initData: string | null | undefined,
  botToken: string | null | undefined,
  options: { maxAgeSeconds?: number; now?: number } = {},
): ValidationResult {
  if (!initData) return { ok: false, reason: 'missing_init_data' }
  if (!botToken) return { ok: false, reason: 'missing_bot_token' }

  let params: URLSearchParams
  try {
    params = new URLSearchParams(initData)
  } catch {
    return { ok: false, reason: 'malformed' }
  }

  const hash = params.get('hash')
  if (!hash) return { ok: false, reason: 'missing_hash' }

  const pairs: string[] = []
  const raw: Record<string, string> = {}
  for (const [key, value] of params.entries()) {
    raw[key] = value
    if (key === 'hash' || key === 'signature') continue
    pairs.push(`${key}=${value}`)
  }
  pairs.sort()
  const dataCheckString = pairs.join('\n')

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest()
  const computed = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  const expected = Buffer.from(computed, 'hex')
  let provided: Buffer
  try {
    provided = Buffer.from(hash, 'hex')
  } catch {
    return { ok: false, reason: 'bad_signature' }
  }
  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    return { ok: false, reason: 'bad_signature' }
  }

  const authDate = Number(params.get('auth_date'))
  if (!Number.isFinite(authDate) || authDate <= 0) {
    return { ok: false, reason: 'malformed' }
  }

  const maxAge = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS
  const now = options.now ?? Math.floor(Date.now() / 1000)
  if (maxAge > 0 && now - authDate > maxAge) {
    return { ok: false, reason: 'expired' }
  }

  const userRaw = params.get('user')
  let user: TelegramUser | undefined
  if (userRaw) {
    try {
      const parsed = JSON.parse(userRaw) as TelegramUser
      if (typeof parsed?.id === 'number' && Number.isFinite(parsed.id)) {
        user = parsed
      }
    } catch {
      return { ok: false, reason: 'malformed' }
    }
  }
  if (!user) return { ok: false, reason: 'missing_user' }

  return {
    ok: true,
    data: {
      user,
      authDate,
      queryId: params.get('query_id') ?? undefined,
      startParam: params.get('start_param') ?? undefined,
      raw,
    },
  }
}
