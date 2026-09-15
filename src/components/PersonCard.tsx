'use client'

import Image from 'next/image'
import Link from 'next/link'
import { haptic } from '@/lib/telegram'
import { wikiThumb } from '@/lib/content-utils'

export interface PersonCardData {
  slug: string
  displayName: string
  role: string
  descriptor?: string | null
  imageUrl?: string | null
  imageAlt?: string | null
  categories?: Array<{ isPrimary: boolean; category: { name: string; accent?: string | null } }>
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
}

export function PersonCard({ person, priority = false }: { person: PersonCardData; priority?: boolean }) {
  const primary =
    person.categories?.find((c) => c.isPrimary)?.category ?? person.categories?.[0]?.category

  return (
    <Link
      href={`/people/${person.slug}`}
      onClick={() => haptic.tap()}
      className="group block overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] transition-transform duration-500 ease-editorial active:scale-[0.985]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-ink-800">
        {person.imageUrl ? (
          <Image
            src={wikiThumb(person.imageUrl, 640)!}
            alt={person.imageAlt ?? person.displayName}
            fill
            sizes="(max-width: 720px) 50vw, 240px"
            loading={priority ? undefined : 'lazy'}
            priority={priority}
            className="object-cover object-top transition-transform duration-[900ms] ease-editorial group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="display text-4xl text-bone-600">{initials(person.displayName)}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#08090c] via-[#08090c]/55 to-transparent" />
        {primary && (
          <span
            className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] backdrop-blur-md"
            style={{
              background: 'rgba(8,9,12,0.55)',
              color: primary.accent ?? 'var(--text-dim)',
              border: `1px solid ${primary.accent ?? 'var(--line)'}33`,
            }}
          >
            {primary.name}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <h3 className="display text-[17px] leading-tight text-bone-50">{person.displayName}</h3>
          <p className="mt-1 line-clamp-1 text-[11.5px] text-bone-400">{person.role}</p>
        </div>
      </div>
    </Link>
  )
}

export function PersonCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)]">
      <div className="skeleton aspect-[4/5]" />
    </div>
  )
}

/** Широкая карточка для списков «Продолжить» и результатов поиска. */
export function PersonRow({
  person,
  meta,
}: {
  person: PersonCardData
  meta?: React.ReactNode
}) {
  return (
    <Link
      href={`/people/${person.slug}`}
      onClick={() => haptic.tap()}
      className="flex items-center gap-3.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 transition-colors duration-300 active:bg-ink-800"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-800">
        {person.imageUrl ? (
          <Image
            src={wikiThumb(person.imageUrl, 160)!}
            alt={person.imageAlt ?? person.displayName}
            fill
            sizes="56px"
            className="object-cover object-top"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-bone-600">
            {initials(person.displayName)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-bone-50">{person.displayName}</p>
        <p className="truncate text-[12px] text-bone-400">{person.role}</p>
        {meta}
      </div>
    </Link>
  )
}
