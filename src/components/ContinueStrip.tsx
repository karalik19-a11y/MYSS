'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/telegram'
import { PersonRow, type PersonCardData } from './PersonCard'
import { Reveal, SectionTitle, Skeleton } from './ui'

interface ProgressItem {
  percent: number
  person: PersonCardData
}

/** «Продолжить» появляется только при наличии реального прогресса (§48). */
export function ContinueStrip() {
  const [items, setItems] = useState<ProgressItem[] | null>(null)

  useEffect(() => {
    let cancelled = false
    api<ProgressItem[]>('/api/progress')
      .then((data) => {
        if (!cancelled) setItems(data.filter((p) => p.percent > 0 && p.percent < 100).slice(0, 3))
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (items === null) {
    return (
      <section className="py-8">
        <Skeleton className="mb-4 h-6 w-40" />
        <Skeleton className="h-20 w-full" />
      </section>
    )
  }

  if (items.length === 0) return null

  return (
    <section className="py-8">
      <Reveal>
        <SectionTitle eyebrow="Ты начал" title="Продолжить" />
      </Reveal>
      <div className="space-y-2.5">
        {items.map((item) => (
          <Reveal key={item.person.slug}>
            <PersonRow
              person={item.person}
              meta={
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-ink-700">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-700 ease-editorial"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <span className="text-[10.5px] tabular-nums text-bone-600">{item.percent}%</span>
                </div>
              }
            />
          </Reveal>
        ))}
      </div>
    </section>
  )
}
