type Level = 'info' | 'warn' | 'error' | 'debug'

const SECRET_KEYS = [
  'token',
  'secret',
  'password',
  'hash',
  'initdata',
  'authorization',
  'database_url',
]

function redact(value: unknown): unknown {
  if (value == null) return value
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(redact)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEYS.some((s) => k.toLowerCase().includes(s))) {
      out[k] = '[redacted]'
    } else {
      out[k] = redact(v)
    }
  }
  return out
}

function emit(level: Level, event: string, data?: Record<string, unknown>) {
  const line = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(data ? (redact(data) as Record<string, unknown>) : {}),
  }
  const text = JSON.stringify(line)
  if (level === 'error') console.error(text)
  else if (level === 'warn') console.warn(text)
  else console.log(text)
}

export const logger = {
  info: (event: string, data?: Record<string, unknown>) => emit('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => emit('warn', event, data),
  debug: (event: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production') emit('debug', event, data)
  },
  error: (event: string, error?: unknown, data?: Record<string, unknown>) => {
    const err =
      error instanceof Error
        ? { message: error.message, name: error.name, stack: error.stack }
        : error !== undefined
          ? { message: String(error) }
          : undefined
    emit('error', event, { ...data, error: err })
  },
}
