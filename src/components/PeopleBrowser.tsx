'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { api, haptic } from '@/lib/telegram'
import { PersonCard, PersonCardSkeleton, type PersonCardData } from './PersonCard'
import { Chip, EmptyState, ErrorState } from './ui'
import { IconClose, IconSearch } from './Icons'

interface Category {
  slug: string
  name: string
  count: number
}

interface Result {
  items: PersonCardData[]
  total: number
  page: number
  perPage: number
}

const SORTS = [
  { key: 'recommended', label: 'Рекомендуемые' },
  { key: 'popular', label: 'Популярные' },
  { key: 'new', label: 'Новые' },
  { key: 'name', label: 'По имени' },
] as const

export function PeopleBrowser({ categories }: { categories: Category[] }) {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [category, setCategory] = useState<string | null>(searchParams.get('category'))
  const [sort, setSort] = useState<(typeof SORTS)[number]['key']>('recommended')
  const [data, setData] = useState<Result | null>(null)
  const [error, setError] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchParams.get('focus') === 'search') inputRef.current?.focus()
  }, [searchParams])

  // Debounce поиска (§13)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 280)
    return () => clearTimeout(t)
  }, [query])

  const load = useCallback(
    async (page = 1) => {
      const params = new URLSearchParams()
      if (debounced.length >= 2) params.set('q', debounced)
      if (category) params.set('category', category)
      params.set('sort', sort)
      params.set('page', String(page))

      try {
        const result = await api<Result>(`/api/people?${params}`)
        setError(false)
        setData((prev) =>
          page > 1 && prev ? { ...result, items: [...prev.items, ...result.items] } : result,
        )
      } catch {
        setError(true)
      }
    },
    [debounced, category, sort],
  )

  useEffect(() => {
    setData(null)
    load(1)
  }, [load])

  async function loadMore() {
    if (!data || loadingMore) return
    setLoadingMore(true)
    await load(data.page + 1)
    setLoadingMore(false)
  }

  const hasMore = data ? data.page * data.perPage < data.total : false

  return (
    <main className="container-app pt-6">
      <header className="pb-5 pt-2">
        <p className="eyebrow">Библиотека</p>
        <h1 className="display mt-3 text-[32px] text-bone-50">Люди</h1>
      </header>

      {/* Поиск */}
      <div className="sticky top-0 z-30 -mx-5 bg-[var(--bg)]/95 px-5 pb-3 pt-1 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5">
          <IconSearch size={18} className="shrink-0 text-bone-600" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            aria-label="Поиск по имени, профессии, стране или теме"
            placeholder="Имя, профессия, страна, тема"
            className="h-12 w-full bg-transparent text-[14.5px] text-bone-50 placeholder:text-bone-600 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Очистить поиск"
              className="tap shrink-0 text-bone-600"
            >
              <IconClose size={17} />
            </button>
          )}
        </div>

        {/* Категории */}
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          <Chip
            active={!category}
            onClick={() => {
              haptic.select()
              setCategory(null)
            }}
          >
            Все
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c.slug}
              active={category === c.slug}
              onClick={() => {
                haptic.select()
                setCategory(category === c.slug ? null : c.slug)
              }}
            >
              {c.name}
            </Chip>
          ))}
        </div>

        {/* Сортировка */}
        <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                haptic.select()
                setSort(s.key)
              }}
              className={`whitespace-nowrap py-1.5 text-[12px] transition-colors duration-200 ${
                sort === s.key ? 'text-bone-50' : 'text-bone-600'
              }`}
            >
              {s.label}
              {sort === s.key && <span className="mt-1 block h-px bg-[var(--accent)]" />}
            </button>
          ))}
        </div>
      </div>

      {/* Результаты */}
      <section className="pb-8 pt-4">
        {error ? (
          <ErrorState onRetry={() => load(1)} />
        ) : data === null ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <PersonCardSkeleton key={i} />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState
            title="Ничего не нашли"
            description="Попробуй имя, профессию или тему."
          />
        ) : (
          <>
            <p className="mb-4 text-[11.5px] text-bone-600">
              {data.total}{' '}
              {data.total % 10 === 1 && data.total % 100 !== 11
                ? 'человек'
                : [2, 3, 4].includes(data.total % 10) && ![12, 13, 14].includes(data.total % 100)
                  ? 'человека'
                  : 'человек'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {data.items.map((p, i) => (
                <PersonCard key={p.slug} person={p} priority={i < 2} />
              ))}
            </div>
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="tap mt-6 w-full rounded-xl border border-[var(--line)] text-[13.5px] text-bone-200"
              >
                {loadingMore ? 'Загружаем' : 'Показать ещё'}
              </button>
            )}
          </>
        )}
      </section>
    </main>
  )
}
