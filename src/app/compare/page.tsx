'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { api, haptic } from '@/lib/telegram'
import type { PersonCard as PersonCardType } from '@/server/queries'
import { EmptyState, Skeleton } from '@/components/ui'
import { IconCheck } from '@/components/Icons'

interface CompareData {
  people: Array<{ slug: string; displayName: string; role: string; imageUrl?: string | null; imageAlt?: string | null }>
  rows: Array<{ key: string; label: string; values: string[][] }>
}

export default function ComparePage() {
  const [people, setPeople] = useState<PersonCardType[] | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [result, setResult] = useState<CompareData | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ items: PersonCardType[] }>('/api/people?perPage=50')
      .then((d) => setPeople(d.items))
      .catch(() => setPeople([]))
  }, [])

  function toggle(slug: string) {
    haptic.select()
    setResult(null)
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length >= 3 ? prev : [...prev, slug],
    )
  }

  async function compare() {
    if (selected.length < 2 || busy) return
    setBusy(true)
    haptic.tap()
    try {
      setResult(await api<CompareData>(`/api/compare?slugs=${selected.join(',')}`))
    } catch {
      setResult(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="container-app pt-6">
      <header className="pb-6 pt-2">
        <p className="eyebrow">Сравнение</p>
        <h1 className="display mt-3 text-[32px] text-bone-50">Два подхода рядом</h1>
        <p className="mt-3 max-w-[40ch] text-[13.5px] leading-relaxed text-bone-400">
          Выбери двух или трёх человек и посмотри, чем отличается их отношение к работе, риску и
          обучению.
        </p>
      </header>

      {people === null ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5">
          {people.map((p) => (
            <button
              key={p.slug}
              onClick={() => toggle(p.slug)}
              className={`relative w-[92px] shrink-0 overflow-hidden rounded-xl border transition-colors duration-250 ${
                selected.includes(p.slug) ? 'border-[var(--accent)]' : 'border-[var(--line)]'
              }`}
            >
              <div className="relative aspect-[3/4] bg-ink-800">
                {p.imageUrl && (
                  <Image
                    src={p.imageUrl}
                    alt={p.imageAlt ?? p.displayName}
                    fill
                    sizes="92px"
                    className="object-cover object-top"
                  />
                )}
                {selected.includes(p.slug) && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-[var(--accent)] p-1 text-white">
                    <IconCheck size={11} />
                  </span>
                )}
              </div>
              <p className="line-clamp-2 p-2 text-left text-[10.5px] leading-tight text-bone-200">
                {p.displayName}
              </p>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={compare}
        disabled={selected.length < 2 || busy}
        className="tap mt-5 w-full rounded-xl bg-bone-50 text-[14px] font-medium text-ink-950 disabled:opacity-40"
      >
        {busy ? 'Сравниваем' : `Сравнить (${selected.length})`}
      </button>

      {result && (
        <section className="py-8">
          <div className="overflow-hidden rounded-2xl border border-[var(--line)]">
            <div
              className="grid border-b border-[var(--line)] bg-[var(--surface-2)]"
              style={{ gridTemplateColumns: `86px repeat(${result.people.length}, 1fr)` }}
            >
              <div />
              {result.people.map((p) => (
                <div key={p.slug} className="border-l border-[var(--line)] p-3">
                  <p className="text-[12px] font-medium leading-tight text-bone-50">
                    {p.displayName}
                  </p>
                </div>
              ))}
            </div>
            {result.rows.map((row) => (
              <div
                key={row.key}
                className="grid border-b border-[var(--line)] last:border-0"
                style={{ gridTemplateColumns: `86px repeat(${result.people.length}, 1fr)` }}
              >
                <div className="bg-[var(--surface)] p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-bone-600">
                    {row.label}
                  </p>
                </div>
                {row.values.map((cell, i) => (
                  <div key={i} className="border-l border-[var(--line)] p-3">
                    {cell.length === 0 ? (
                      <span className="text-[11.5px] text-bone-600">Нет данных</span>
                    ) : (
                      <ul className="space-y-1.5">
                        {cell.map((v, j) => (
                          <li key={j} className="text-[12px] leading-relaxed text-bone-200">
                            {v}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-bone-600">
            Пустая ячейка означает, что подтверждённых данных по этому параметру пока нет. Мы не
            заполняем такие места догадками.
          </p>
        </section>
      )}

      {!result && selected.length === 0 && people?.length === 0 && (
        <div className="py-8">
          <EmptyState
            title="Пока некого сравнивать"
            description="В библиотеке должно быть хотя бы два опубликованных человека."
          />
        </div>
      )}
      <div className="h-6" />
    </main>
  )
}
