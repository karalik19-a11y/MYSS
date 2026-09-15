'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api, haptic } from '@/lib/telegram'
import { EmptyState, Skeleton } from '@/components/ui'
import { IconBack, IconCheck } from '@/components/Icons'
import { CONFIDENCE_LABELS, SOURCE_TYPE_LABELS } from '@/lib/content-utils'

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUSES = ['draft', 'review', 'verified', 'published'] as const
const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  review: 'На проверке',
  verified: 'Проверен',
  published: 'Опубликован',
}

export default function AdminPersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [person, setPerson] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [image, setImage] = useState({ url: '', alt: '', credit: '', source: '' })

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await api<any>(`/api/admin/people/${slug}`)
      setPerson(data)
      setImage({
        url: data.imageUrl ?? '',
        alt: data.imageAlt ?? '',
        credit: data.imageCredit ?? '',
        source: data.imageSource ?? '',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить.')
    }
  }, [slug])

  useEffect(() => {
    load()
  }, [load])

  async function patch(body: Record<string, unknown>, message: string) {
    setSaving(true)
    setNotice(null)
    haptic.tap()
    try {
      await api(`/api/admin/people/${slug}`, { method: 'PATCH', body: JSON.stringify(body) })
      await load()
      setNotice(message)
      haptic.success()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Не получилось сохранить.')
      haptic.warning()
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return (
      <main className="container-app pt-10">
        <EmptyState title="Не открылось" description={error} />
      </main>
    )
  }

  if (!person) {
    return (
      <main className="container-app space-y-3 pt-10">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
      </main>
    )
  }

  return (
    <main className="container-app pb-10 pt-6">
      <Link href="/admin" className="tap -ml-2 justify-start gap-2 text-[13px] text-bone-400">
        <IconBack size={16} />
        К списку
      </Link>

      <header className="pb-6 pt-4">
        <h1 className="display text-[26px] leading-tight text-bone-50">{person.name}</h1>
        <p className="mt-1.5 text-[12.5px] text-bone-600">
          {person.role} · {person.country} · {person.slug}
        </p>
      </header>

      {notice && (
        <p className="mb-5 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-[12.5px] text-bone-200">
          {notice}
        </p>
      )}

      {/* Статус публикации */}
      <section className="mb-6">
        <p className="eyebrow mb-3">Статус</p>
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              disabled={saving}
              onClick={() => patch({ status: s }, `Статус изменён: ${STATUS_LABELS[s]}`)}
              className={`tap rounded-lg border text-[12.5px] ${
                person.status === s
                  ? 'border-transparent bg-bone-50 text-ink-950'
                  : 'border-[var(--line)] text-bone-300'
              }`}
            >
              {person.status === s && <IconCheck size={13} className="mr-1.5" />}
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-bone-600">
          Публикация возможна только при наличии источников, фактов и изображения.
        </p>
      </section>

      {/* Достоверность */}
      <section className="mb-6">
        <p className="eyebrow mb-3">Достоверность</p>
        <div className="grid grid-cols-3 gap-2">
          {(['high', 'medium', 'low'] as const).map((c) => (
            <button
              key={c}
              disabled={saving}
              onClick={() => patch({ confidence: c }, 'Уровень достоверности обновлён')}
              className={`tap rounded-lg border text-[12px] ${
                person.confidence === c
                  ? 'border-transparent bg-bone-50 text-ink-950'
                  : 'border-[var(--line)] text-bone-300'
              }`}
            >
              {CONFIDENCE_LABELS[c]}
            </button>
          ))}
        </div>
      </section>

      {/* Изображение */}
      <section className="mb-6 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <p className="eyebrow mb-3">Изображение</p>
        <div className="space-y-2.5">
          <Input label="URL" value={image.url} onChange={(v) => setImage({ ...image, url: v })} />
          <Input
            label="Альтернативный текст"
            value={image.alt}
            onChange={(v) => setImage({ ...image, alt: v })}
          />
          <Input
            label="Источник"
            value={image.source}
            onChange={(v) => setImage({ ...image, source: v })}
          />
          <Input
            label="Автор / права"
            value={image.credit}
            onChange={(v) => setImage({ ...image, credit: v })}
          />
        </div>
        <button
          disabled={saving || !image.url || image.alt.length < 3}
          onClick={() =>
            patch(
              {
                image: {
                  url: image.url,
                  alt: image.alt,
                  source: image.source || undefined,
                  credit: image.credit || undefined,
                },
              },
              'Изображение обновлено',
            )
          }
          className="tap mt-4 w-full rounded-lg bg-bone-50 text-[13px] font-medium text-ink-950 disabled:opacity-40"
        >
          Сохранить изображение
        </button>
      </section>

      {/* Содержимое */}
      <section className="mb-6 grid grid-cols-3 gap-2">
        <Count label="Факты" value={person.facts.length} />
        <Count label="Принципы" value={person.principles.length} />
        <Count label="Привычки" value={person.habits.length} />
        <Count label="Цитаты" value={person.quotes.length} />
        <Count label="Кейсы" value={person.cases.length} />
        <Count label="Ошибки" value={person.mistakes.length} />
      </section>

      {/* Источники */}
      <section className="mb-6">
        <p className="eyebrow mb-3">Источники ({person.sources.length})</p>
        {person.sources.length === 0 ? (
          <p className="text-[12.5px] text-bone-600">
            Источников нет. Без них публикация невозможна.
          </p>
        ) : (
          <ul className="space-y-2">
            {person.sources.map((s: any) => (
              <li
                key={s.id}
                className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3"
              >
                <p className="text-[12.5px] text-bone-100">{s.title}</p>
                <p className="mt-1 text-[11px] text-bone-600">
                  {SOURCE_TYPE_LABELS[s.type]}
                  {s.author && ` · ${s.author}`}
                  {s.publishedAt && ` · ${s.publishedAt}`}
                </p>
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate text-[11px] text-bone-400 underline underline-offset-2"
                  >
                    {s.url}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Claims */}
      <section>
        <p className="eyebrow mb-3">Утверждения ({person.claims.length})</p>
        {person.claims.length === 0 ? (
          <p className="text-[12.5px] text-bone-600">Утверждений пока нет.</p>
        ) : (
          <ul className="space-y-2">
            {person.claims.slice(0, 20).map((c: any) => (
              <li
                key={c.id}
                className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3"
              >
                <p className="text-[12.5px] leading-relaxed text-bone-200">{c.text}</p>
                <p className="mt-1.5 text-[10.5px] uppercase tracking-wide text-bone-600">
                  {STATUS_LABELS[c.status]} · {CONFIDENCE_LABELS[c.confidence]} ·{' '}
                  {c.sources.length} источн.
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-[11.5px] leading-relaxed text-bone-600">
        Массовое наполнение выполняется через файлы в content/ и команды npm run validate-content и
        npm run seed. Здесь удобно проверять и публиковать.
      </p>
    </main>
  )
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-bone-600">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-bone-50 focus:border-bone-600 focus:outline-none"
      />
    </label>
  )
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--line)] p-2.5 text-center">
      <p className="display text-[17px] tabular-nums text-bone-50">{value}</p>
      <p className="mt-0.5 text-[9.5px] uppercase tracking-wide text-bone-600">{label}</p>
    </div>
  )
}
