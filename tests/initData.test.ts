import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { validateInitData } from '../src/server/telegram/initData'

const BOT_TOKEN = '123456:TEST-TOKEN-FOR-UNIT-TESTS'

/** Собирает корректно подписанную строку initData. */
function signInitData(
  params: Record<string, string>,
  token = BOT_TOKEN,
): string {
  const pairs = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
  const dataCheckString = pairs.join('\n')
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest()
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  const search = new URLSearchParams(params)
  search.set('hash', hash)
  return search.toString()
}

const now = Math.floor(Date.now() / 1000)
const validUser = JSON.stringify({ id: 42, first_name: 'Тест', username: 'tester' })

describe('validateInitData', () => {
  it('принимает корректно подписанные данные', () => {
    const initData = signInitData({ auth_date: String(now), user: validUser })
    const result = validateInitData(initData, BOT_TOKEN, { now })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.user?.id).toBe(42)
      expect(result.data.authDate).toBe(now)
    }
  })

  it('отклоняет подпись, сделанную другим токеном', () => {
    const initData = signInitData(
      { auth_date: String(now), user: validUser },
      '999:ANOTHER-TOKEN',
    )
    const result = validateInitData(initData, BOT_TOKEN, { now })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('bad_signature')
  })

  it('отклоняет подделанный user при валидном по форме hash', () => {
    const initData = signInitData({ auth_date: String(now), user: validUser })
    const tampered = initData.replace(
      encodeURIComponent(validUser),
      encodeURIComponent(JSON.stringify({ id: 1, first_name: 'Взломщик' })),
    )
    const result = validateInitData(tampered, BOT_TOKEN, { now })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('bad_signature')
  })

  it('отклоняет устаревшие данные', () => {
    const old = now - 90_000
    const initData = signInitData({ auth_date: String(old), user: validUser })
    const result = validateInitData(initData, BOT_TOKEN, { now })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('expired')
  })

  it('отклоняет данные без hash', () => {
    const result = validateInitData(
      `auth_date=${now}&user=${encodeURIComponent(validUser)}`,
      BOT_TOKEN,
      { now },
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('missing_hash')
  })

  it('отклоняет пустой initData', () => {
    const result = validateInitData('', BOT_TOKEN)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('missing_init_data')
  })

  it('не проходит проверку без настроенного токена бота', () => {
    const initData = signInitData({ auth_date: String(now), user: validUser })
    const result = validateInitData(initData, undefined, { now })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('missing_bot_token')
  })

  it('требует наличия пользователя', () => {
    const initData = signInitData({ auth_date: String(now), query_id: 'abc' })
    const result = validateInitData(initData, BOT_TOKEN, { now })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('missing_user')
  })

  it('игнорирует поле signature при подсчёте хеша', () => {
    const params = { auth_date: String(now), user: validUser }
    const initData = signInitData(params)
    const withSignature = `${initData}&signature=abc123`
    const result = validateInitData(withSignature, BOT_TOKEN, { now })
    expect(result.ok).toBe(true)
  })
})
