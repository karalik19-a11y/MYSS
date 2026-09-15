'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { api } from '@/lib/telegram'
import { PersonRow } from '@/components/PersonCard'
import { EmptyState, ErrorState, Reveal, Skeleton } from '@/components/ui'
import { IconArrow } from '@/components/Icons'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Me {
  user: {
    firstName?: string | null
    lastName?: string | null
    username?: string | null
    photoUrl?: string | null
    isAdmin: boolean
  }
  stats: { studied: number; completed: number; overall: number; favorites: number; routines: number }
  progress: any[]
  interests: Array<{ slug: string; name: string }>
}

export default function ProfilePage() {
  const [data, setData] = useState<Me | null>(null)
  const [error, setError] = useState(false)

  function load() {
    setError(false)
    api<Me>('/api/me')
      .then(setData)
      .catch(() => setError(true))
  }

  useEffect(load, [])

  if (error) {
    return (
      <main className="container-app pt-10">
        <ErrorState onRetry={load} />
      </main>
    )
  }

  if (!data) {
    return (
      <main className="container-app space-y-4 pt-10">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-28 w-full" />
      </main>
    )
  }

  const name = [data.user.firstName, data.user.lastName].filter(Boolean).join(' ') || 'Профиль'

  return (
    <main className="container-app pt-6">
      <header className="flex items-center gap-4 pb-8 pt-2">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-ink-800">
          {data.user.photoUrl ? (
            <Image src={data.user.photoUrl} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center display text-[20px] text-bone-600">
              {name.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="display truncate text-[24px] text-bone-50">{name}</h1>
          {data.user.username && (
            <p className="text-[12.5px] text-bone-600">@{data.user.username}</p>
          )}
        </div>
      </header>

      <Reveal>
        <section className="grid grid-cols-3 gap-2.5">
          <Stat value={data.stats.studied} label="Изучает" />
          <Stat value={data.stats.completed} label="Завершено" />
          <Stat value={data.stats.favorites} label="Сохранено" />
        </section>
      </Reveal>

      {data.stats.studied > 0 && (
        <Reveal>
          <section className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <p className="text-[13px] text-bone-400">Общий прогресс</p>
              <p className="display text-[22px] tabular-nums text-bone-50">
                {data.stats.overall}%
              </p>
            </div>
            <div className="h-[3px] overflow-hidden rounded-full bg-ink-700">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-700 ease-editorial"
                style={{ width: `${data.stats.overall}%` }}
              />
            </div>
          </section>
        </Reveal>
      )}

      {data.interests.length > 0 && (
        <Reveal>
          <section className="mt-8">
            <p className="eyebrow mb-3">Что тебе интересно</p>
            <div className="flex flex-wrap gap-2">
              {data.interests.map((c) => (
                <Link
                  key={c.slug}
                  href={`/people?category=${c.slug}`}
                  className="rounded-full border border-[var(--line)] px-3.5 py-2 text-[12.5px] text-bone-300"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      <section className="py-8">
        <p className="eyebrow mb-4">Изученные</p>
        {data.progress.length === 0 ? (
          <EmptyState
            title="Пока пусто"
            description="Выбери человека и начни с первого раздела."
            action={
              <Link
                href="/people"
                className="tap gap-2 rounded-full bg-bone-50 px-5 text-[13px] font-medium text-ink-950"
              >
                К людям
                <IconArrow size={15} />
              </Link>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {data.progress.map((p: any) => (
              <PersonRow
                key={p.person.slug}
                person={p.person}
                meta={
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-ink-700">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${p.percent}%` }}
                      />
                    </div>
                    <span className="text-[10.5px] tabular-nums text-bone-600">{p.percent}%</span>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>

      {data.stats.routines > 0 && (
        <Link
          href="/day"
          className="tap w-full justify-between rounded-xl border border-[var(--line)] px-5 text-[13.5px] text-bone-200"
        >
          Мои распорядки ({data.stats.routines})
          <IconArrow size={16} className="text-bone-600" />
        </Link>
      )}

      {data.user.isAdmin && (
        <Link
          href="/admin"
          className="tap mt-3 w-full justify-between rounded-xl border border-[var(--line)] px-5 text-[13.5px] text-bone-400"
        >
          Управление контентом
          <IconArrow size={16} className="text-bone-600" />
        </Link>
      )}

      <div className="h-8" />
    </main>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-4 text-center">
      <p className="display text-[24px] tabular-nums text-bone-50">{value}</p>
      <p className="mt-1 text-[10.5px] uppercase tracking-[0.1em] text-bone-600">{label}</p>
    </div>
  )
}
