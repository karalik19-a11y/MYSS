'use client'

import { useEffect, useState } from 'react'
import { api, haptic } from '@/lib/telegram'
import { PersonRow } from '@/components/PersonCard'
import { Chip, EmptyState, ErrorState, Reveal, Skeleton } from '@/components/ui'
import { IconClose } from '@/components/Icons'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Favorites {
  people: any[]
  quotes: any[]
  cases: any[]
  principles: any[]
  total: number
}

const TABS = [
  { key: 'people', label: 'Люди' },
  { key: 'quotes', label: 'Цитаты' },
  { key: 'principles', label: 'Принципы' },
  { key: 'cases', label: 'Кейсы' },
] as const

export default function SavedPage() {
  const [data, setData] = useState<Favorites | null>(null)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('people')

  function load() {
    setError(false)
    api<Favorites>('/api/favorites')
      .then(setData)
      .catch(() => setError(true))
  }

  useEffect(load, [])

  async function remove(id: string) {
    haptic.tap()
    setData((prev) =>
      prev
        ? {
            ...prev,
            people: prev.people.filter((f) => f.id !== id),
            quotes: prev.quotes.filter((f) => f.id !== id),
            cases: prev.cases.filter((f) => f.id !== id),
            principles: prev.principles.filter((f) => f.id !== id),
            total: prev.total - 1,
          }
        : prev,
    )
    try {
      await api(`/api/favorites/${id}`, { method: 'DELETE' })
    } catch {
      load()
    }
  }

  const items = data ? data[tab] : []

  return (
    <main className="container-app pt-6">
      <header className="pb-5 pt-2">
        <p className="eyebrow">Твоя библиотека</p>
        <h1 className="display mt-3 text-[32px] text-bone-50">Сохранённое</h1>
      </header>

      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-5">
        {TABS.map((t) => (
          <Chip
            key={t.key}
            active={tab === t.key}
            onClick={() => {
              haptic.select()
              setTab(t.key)
            }}
          >
            {t.label}
            {data && data[t.key].length > 0 && (
              <span className="ml-1.5 opacity-60">{data[t.key].length}</span>
            )}
          </Chip>
        ))}
      </div>

      <section className="pb-8">
        {error ? (
          <ErrorState onRetry={load} />
        ) : data === null ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Пока здесь пусто"
            description="Сохраняй людей, цитаты и кейсы, к которым захочешь вернуться."
          />
        ) : (
          <div className="space-y-3">
            {items.map((fav: any) => (
              <Reveal key={fav.id}>
                <SavedItem kind={tab} favorite={fav} onRemove={() => remove(fav.id)} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function SavedItem({
  kind,
  favorite,
  onRemove,
}: {
  kind: string
  favorite: any
  onRemove: () => void
}) {
  if (kind === 'people' && favorite.person) {
    return (
      <div className="relative">
        <PersonRow person={favorite.person} />
        <RemoveButton onClick={onRemove} />
      </div>
    )
  }

  const person =
    favorite.quote?.person ?? favorite.caseStudy?.person ?? favorite.principle?.person

  return (
    <div className="relative rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 pr-12">
      {kind === 'quotes' && favorite.quote && (
        <>
          <p className="display text-[16px] leading-snug text-bone-50">
            {favorite.quote.isVerbatim ? `«${favorite.quote.text}»` : favorite.quote.text}
          </p>
          {favorite.quote.source && (
            <p className="mt-2 text-[11.5px] text-bone-600">{favorite.quote.source.title}</p>
          )}
        </>
      )}
      {kind === 'principles' && favorite.principle && (
        <>
          <p className="text-[14.5px] font-medium text-bone-50">{favorite.principle.title}</p>
          {favorite.principle.explanation && (
            <p className="mt-2 text-[13px] leading-relaxed text-bone-400">
              {favorite.principle.explanation}
            </p>
          )}
        </>
      )}
      {kind === 'cases' && favorite.caseStudy && (
        <>
          <p className="text-[14.5px] font-medium text-bone-50">{favorite.caseStudy.title}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-bone-400">
            {favorite.caseStudy.lesson}
          </p>
        </>
      )}
      {person && (
        <p className="mt-3 text-[11.5px] text-bone-600">{person.displayName}</p>
      )}
      <RemoveButton onClick={onRemove} />
    </div>
  )
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Убрать из сохранённого"
      className="tap absolute right-1 top-1 text-bone-600"
    >
      <IconClose size={16} />
    </button>
  )
}
