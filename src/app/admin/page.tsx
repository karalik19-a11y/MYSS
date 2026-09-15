'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api, haptic } from '@/lib/telegram'
import { Chip, EmptyState, Skeleton } from '@/components/ui'
import { IconArrow, IconSearch } from '@/components/Icons'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface AdminList {
  items: any[]
  total: number
  page: number
  perPage: number
  counts: Record<string, number>
}

const STATUSES = [
  { key: '', label: 'Все' },
  { key: 'draft', label: 'Черновики' },
  { key: 'review', label: 'На проверке' },
  { key: 'verified', label: 'Проверено' },
  { key: 'published', label: 'Опубликовано' },
] as const

export default function AdminPage() {
  const [data, setData] = useState<AdminList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 280)
    return () => clearTimeout(t)
  }, [query])

  const load = useCallback(async () => {
    setError(null)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (debounced.length >= 2) params.set('q', debounced)
    try {
      setData(await api<AdminList>(`/api/admin/people?${params}`))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Нет доступа.')
    }
  }, [status, debounced])

  useEffect(() => {
    setData(null)
    load()
  }, [load])

  if (error) {
    return (
      <main className="container-app pt-10">
        <EmptyState title="Доступ закрыт" description={error} />
      </main>
    )
  }

  return (
    <main className="container-app pb-10 pt-6">
      <header className="pb-5 pt-2">
        <p className="eyebrow">Администрирование</p>
        <h1 className="display mt-3 text-[30px] text-bone-50">Контент</h1>
      </header>

      {data && (
        <div className="mb-5 grid grid-cols-4 gap-2">
          {(['draft', 'review', 'verified', 'published'] as const).map((s) => (
            <div key={s} className="rounded-lg border border-[var(--line)] p-2.5 text-center">
              <p className="display text-[17px] tabular-nums text-bone-50">
                {data.counts[s] ?? 0}
              </p>
              <p className="mt-0.5 text-[9.5px] uppercase tracking-wide text-bone-600">
                {STATUSES.find((x) => x.key === s)?.label}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5">
        <IconSearch size={18} className="shrink-0 text-bone-600" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти человека"
          aria-label="Поиск по базе"
          className="h-12 w-full bg-transparent text-[14px] text-bone-50 placeholder:text-bone-600 focus:outline-none"
        />
      </div>

      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
        {STATUSES.map((s) => (
          <Chip
            key={s.key}
            active={status === s.key}
            onClick={() => {
              haptic.select()
              setStatus(s.key)
            }}
          >
            {s.label}
          </Chip>
        ))}
      </div>

      <section className="mt-5 space-y-2">
        {data === null ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : data.items.length === 0 ? (
          <EmptyState title="Ничего не нашли" description="Измени запрос или фильтр статуса." />
        ) : (
          data.items.map((p) => (
            <Link
              key={p.slug}
              href={`/admin/${p.slug}`}
              className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] text-bone-50">{p.name}</p>
                <p className="truncate text-[11.5px] text-bone-600">
                  {p.role} · {p.country}
                </p>
                <div className="mt-1.5 flex gap-2.5 text-[10px] text-bone-600">
                  <span>Факты {p._count.facts}</span>
                  <span>Цитаты {p._count.quotes}</span>
                  <span>Источники {p._count.sources}</span>
                </div>
              </div>
              <StatusTag status={p.status} />
              <IconArrow size={15} className="shrink-0 text-bone-600" />
            </Link>
          ))
        )}
      </section>

      {data && data.total > data.items.length && (
        <p className="mt-5 text-center text-[11.5px] text-bone-600">
          Показано {data.items.length} из {data.total}
        </p>
      )}
    </main>
  )
}

function StatusTag({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    draft: { label: 'Черновик', color: '#6e695f' },
    review: { label: 'Проверка', color: '#d4a24c' },
    verified: { label: 'Проверен', color: '#5aa9a3' },
    published: { label: 'Опубликован', color: '#6fbf5a' },
  }
  const s = map[status] ?? map.draft
  return (
    <span
      className="shrink-0 rounded-full border px-2 py-1 text-[9.5px] uppercase tracking-wide"
      style={{ color: s.color, borderColor: `${s.color}44` }}
    >
      {s.label}
    </span>
  )
}
