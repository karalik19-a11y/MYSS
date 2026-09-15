'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import type { PersonCard as PersonCardType } from '@/server/queries'
import { PersonCard } from './PersonCard'
import { Reveal, SectionTitle } from './ui'
import { IconArrow, IconCheck, IconSaved, IconShare, IconSource } from './Icons'
import { api, haptic, tg } from '@/lib/telegram'
import { CONFIDENCE_LABELS, lifespan, parseList, SOURCE_TYPE_LABELS, wikiThumb } from '@/lib/content-utils'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  person: any
  related: PersonCardType[]
}

export function PersonView({ person, related }: Props) {
  const heroRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '18%'])
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, reduce ? 1 : 0.25])

  const sections = person.course?.sections ?? []
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [percent, setPercent] = useState(0)
  const [savedPerson, setSavedPerson] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const years = lifespan(person.birthYear, person.deathYear)

  useEffect(() => {
    api<{ percent: number; completedSections: string[] }>(
      `/api/progress?personSlug=${person.slug}`,
    )
      .then((p) => {
        setPercent(p.percent)
        setCompleted(new Set(p.completedSections))
      })
      .catch(() => {})
  }, [person.slug])

  // Подсветка активного раздела в оглавлении
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) setActiveSection(visible[0].target.id)
      },
      { rootMargin: '-25% 0px -60% 0px' },
    )
    for (const s of sections) {
      const el = document.getElementById(`section-${s.kind}`)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [sections])

  async function toggleSection(sectionId: string) {
    const isDone = completed.has(sectionId)
    haptic.tap()
    const next = new Set(completed)
    if (isDone) next.delete(sectionId)
    else next.add(sectionId)
    setCompleted(next)

    try {
      const res = await api<{ percent: number }>('/api/progress', {
        method: 'POST',
        body: JSON.stringify({
          personSlug: person.slug,
          sectionId,
          completed: !isDone,
        }),
      })
      setPercent(res.percent)
      if (!isDone) haptic.success()
    } catch {
      setCompleted(completed)
    }
  }

  async function savePerson() {
    if (savedPerson) return
    haptic.tap()
    setSavedPerson(true)
    try {
      await api('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({ kind: 'person', targetId: person.slug }),
      })
      haptic.success()
    } catch {
      setSavedPerson(false)
    }
  }

  function share() {
    haptic.tap()
    const app = tg()
    const url = `${window.location.origin}/people/${person.slug}`
    const text = `${person.displayName} — ${person.role}`
    if (app?.openTelegramLink) {
      app.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      )
    } else if (navigator.share) {
      navigator.share({ title: text, url }).catch(() => {})
    }
  }

  const sectionData = useMemo(
    () => ({
      interesting: person.facts ?? [],
      principles: person.principles ?? [],
      habits: person.habits ?? [],
      cases: person.cases ?? [],
      mistakes: person.mistakes ?? [],
      quotes: person.quotes ?? [],
    }),
    [person],
  )

  return (
    <main>
      {/* HERO */}
      <div ref={heroRef} className="relative h-[72vh] min-h-[440px] overflow-hidden">
        <motion.div style={{ y, opacity: fade }} className="absolute inset-0">
          {person.imageUrl ? (
            <Image
              src={wikiThumb(person.imageUrl, 1280)!}
              alt={person.imageAlt ?? person.displayName}
              fill
              priority
              fetchPriority="high"
              sizes="100vw"
              className="object-cover object-top"
            />
          ) : (
            <div className="h-full w-full bg-ink-850" />
          )}
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#08090c] via-[#08090c]/35 to-[#08090c]/45" />

        <div className="container-app absolute inset-x-0 bottom-0 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-wrap items-center gap-2">
              {person.categories?.slice(0, 2).map((pc: any) => (
                <Link
                  key={pc.category.slug}
                  href={`/people?category=${pc.category.slug}`}
                  className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-bone-200 backdrop-blur-md"
                >
                  {pc.category.name}
                </Link>
              ))}
            </div>

            <h1 className="display mt-4 text-[38px] leading-[0.95] text-bone-50">
              {person.displayName}
            </h1>
            <p className="mt-2.5 text-[14px] text-bone-200">{person.role}</p>
            <p className="mt-1 text-[12.5px] text-bone-400">
              {person.country}
              {years && ` · ${years}`}
            </p>

            {person.descriptor && (
              <p className="mt-4 max-w-[44ch] text-[14px] leading-relaxed text-bone-200">
                {person.descriptor}
              </p>
            )}

            <div className="mt-6 flex items-center gap-2.5">
              <a
                href="#course"
                onClick={() => haptic.tap()}
                className="tap flex-1 gap-2 rounded-xl bg-bone-50 px-5 text-[14px] font-medium text-ink-950"
              >
                Начать изучение
                <IconArrow size={16} />
              </a>
              <button
                onClick={savePerson}
                aria-label="Сохранить"
                aria-pressed={savedPerson}
                className={`tap rounded-xl border px-4 ${
                  savedPerson
                    ? 'border-transparent bg-[var(--accent)] text-white'
                    : 'border-white/20 text-bone-100'
                }`}
              >
                <IconSaved size={18} />
              </button>
              <button
                onClick={share}
                aria-label="Поделиться"
                className="tap rounded-xl border border-white/20 px-4 text-bone-100"
              >
                <IconShare size={18} />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container-app">
        {/* Прогресс + оглавление */}
        <div
          id="course"
          className="sticky top-0 z-30 -mx-5 scroll-mt-0 border-b border-[var(--line)] bg-[var(--bg)]/95 px-5 py-3 backdrop-blur-xl"
        >
          <div className="mb-2.5 flex items-center gap-3">
            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-ink-700">
              <motion.div
                className="h-full rounded-full bg-[var(--accent)]"
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className="text-[10.5px] tabular-nums text-bone-600">{percent}%</span>
          </div>
          <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5">
            {sections.map((s: any) => (
              <a
                key={s.id}
                href={`#section-${s.kind}`}
                onClick={() => haptic.select()}
                className={`whitespace-nowrap py-1 text-[12px] transition-colors duration-200 ${
                  activeSection === `section-${s.kind}` ? 'text-bone-50' : 'text-bone-600'
                }`}
              >
                {completed.has(s.id) && (
                  <IconCheck size={12} className="mr-1 inline text-[var(--accent)]" />
                )}
                {s.title}
              </a>
            ))}
          </div>
        </div>

        {/* Введение курса */}
        {person.course?.intro && (
          <Reveal>
            <p className="border-l-2 border-[var(--accent)] py-1 pl-4 text-[15px] leading-relaxed text-bone-200">
              {person.course.intro}
            </p>
          </Reveal>
        )}

        {/* Разделы */}
        <div className="space-y-14 pb-10 pt-10">
          {sections.map((section: any) => (
            <section
              key={section.id}
              id={`section-${section.kind}`}
              className="scroll-mt-32"
              aria-label={section.title}
            >
              <Reveal>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">Раздел</p>
                    <h2 className="display mt-2 text-[25px] leading-tight text-bone-50">
                      {section.title}
                    </h2>
                    {section.subtitle && (
                      <p className="mt-2 text-[13px] text-bone-400">{section.subtitle}</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleSection(section.id)}
                    aria-label={
                      completed.has(section.id)
                        ? 'Отметить раздел незавершённым'
                        : 'Отметить раздел завершённым'
                    }
                    aria-pressed={completed.has(section.id)}
                    className={`tap shrink-0 rounded-full border transition-colors duration-300 ${
                      completed.has(section.id)
                        ? 'border-transparent bg-[var(--accent)] text-white'
                        : 'border-[var(--line)] text-bone-600'
                    }`}
                  >
                    <IconCheck size={17} />
                  </button>
                </div>
              </Reveal>

              <SectionBody
                kind={section.kind}
                body={section.body}
                data={sectionData}
                personName={person.displayName}
              />
            </section>
          ))}
        </div>

        {/* Источники */}
        {person.sources?.length > 0 && (
          <Reveal>
            <section className="border-t border-[var(--line)] py-8">
              <div className="mb-4 flex items-center gap-2">
                <IconSource className="text-bone-600" />
                <h2 className="text-[13px] font-medium text-bone-200">На чём это основано</h2>
              </div>
              <ul className="space-y-3">
                {person.sources.map((s: any) => (
                  <li key={s.id} className="text-[12.5px] leading-relaxed text-bone-400">
                    <span className="text-bone-600">{SOURCE_TYPE_LABELS[s.type]}</span>
                    {' · '}
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-bone-200 underline decoration-bone-600 underline-offset-2"
                      >
                        {s.title}
                      </a>
                    ) : (
                      <span className="text-bone-200">{s.title}</span>
                    )}
                    {s.author && <span>, {s.author}</span>}
                    {s.publishedAt && <span> ({s.publishedAt})</span>}
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        )}

        {/* Рекомендации */}
        {related.length > 0 && (
          <section className="border-t border-[var(--line)] py-10">
            <Reveal>
              <SectionTitle eyebrow="Дальше" title="Если тебе это интересно" />
            </Reveal>
            <div className="grid grid-cols-2 gap-3">
              {related.slice(0, 4).map((p, i) => (
                <Reveal key={p.slug} delay={i * 0.05}>
                  <PersonCard person={p} />
                </Reveal>
              ))}
            </div>
            <Link
              href={`/day?person=${person.slug}`}
              className="tap mt-6 w-full justify-between rounded-xl border border-[var(--line)] px-5 text-[13.5px] text-bone-200"
            >
              Собрать день по принципам {person.displayName}
              <IconArrow size={16} className="text-bone-600" />
            </Link>
          </section>
        )}
      </div>
    </main>
  )
}

/** Рендер содержимого раздела в зависимости от его типа. */
function SectionBody({
  kind,
  body,
  data,
  personName,
}: {
  kind: string
  body?: string | null
  data: Record<string, any[]>
  personName: string
}) {
  if (kind === 'interesting') {
    return (
      <ul className="space-y-4">
        {data.interesting.map((f: any, i: number) => (
          <Reveal key={f.id} delay={i * 0.04}>
            <li className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-[14px] leading-relaxed text-bone-100">{f.text}</p>
              {f.context && <p className="mt-2 text-[12px] text-bone-600">{f.context}</p>}
              <ConfidenceTag value={f.confidence} />
            </li>
          </Reveal>
        ))}
      </ul>
    )
  }

  if (kind === 'principles') {
    return (
      <ol className="space-y-3">
        {data.principles.map((p: any, i: number) => (
          <Reveal key={p.id} delay={i * 0.04}>
            <li className="flex gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <span className="display shrink-0 text-[20px] leading-none text-[var(--accent)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="text-[14.5px] font-medium leading-snug text-bone-50">{p.title}</p>
                {p.explanation && (
                  <p className="mt-2 text-[13px] leading-relaxed text-bone-400">{p.explanation}</p>
                )}
                <ConfidenceTag value={p.confidence} />
              </div>
            </li>
          </Reveal>
        ))}
      </ol>
    )
  }

  if (kind === 'habits') {
    return (
      <div className="space-y-3">
        <p className="text-[12.5px] leading-relaxed text-bone-600">
          Только подтверждённые привычки. Распорядок {personName} здесь не реконструируется.
        </p>
        {data.habits.map((h: any, i: number) => (
          <Reveal key={h.id} delay={i * 0.04}>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-[14.5px] font-medium text-bone-50">{h.title}</p>
              {h.description && (
                <p className="mt-2 text-[13px] leading-relaxed text-bone-400">{h.description}</p>
              )}
              <ConfidenceTag value={h.confidence} />
            </div>
          </Reveal>
        ))}
      </div>
    )
  }

  if (kind === 'cases') {
    return (
      <div className="space-y-5">
        {data.cases.map((c: any, i: number) => (
          <Reveal key={c.id} delay={i * 0.04}>
            <article className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
              <header className="border-b border-[var(--line)] p-4">
                <h3 className="text-[15px] font-medium leading-snug text-bone-50">{c.title}</h3>
                {c.year && <p className="mt-1 text-[11.5px] text-bone-600">{c.year}</p>}
              </header>
              <div className="divide-y divide-[var(--line)]">
                <CaseRow label="Ситуация" text={c.situation} />
                <CaseRow label="Решение" text={c.decision} />
                <CaseRow label="Результат" text={c.result} />
                <CaseRow label="Чему учит" text={c.lesson} accent />
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    )
  }

  if (kind === 'mistakes') {
    return (
      <div className="space-y-3">
        {data.mistakes.map((m: any, i: number) => (
          <Reveal key={m.id} delay={i * 0.04}>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-[14.5px] font-medium text-bone-50">{m.title}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-bone-300">{m.description}</p>
              {m.consequence && (
                <p className="mt-2.5 text-[12.5px] leading-relaxed text-bone-400">
                  <span className="text-bone-600">Последствия. </span>
                  {m.consequence}
                </p>
              )}
              {m.lesson && (
                <p className="mt-2.5 border-l-2 border-[var(--accent)] pl-3 text-[12.5px] leading-relaxed text-bone-300">
                  {m.lesson}
                </p>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    )
  }

  if (kind === 'quotes') {
    return (
      <div className="space-y-4">
        {data.quotes.map((q: any, i: number) => (
          <Reveal key={q.id} delay={i * 0.04}>
            <figure className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
              <blockquote className="display text-[19px] leading-snug text-bone-50">
                {q.isVerbatim ? `«${q.text}»` : q.text}
              </blockquote>
              {q.context && (
                <figcaption className="mt-3 text-[12px] leading-relaxed text-bone-600">
                  {q.context}
                </figcaption>
              )}
              {q.source && (
                <p className="mt-2 text-[11.5px] text-bone-600">
                  {q.source.url ? (
                    <a
                      href={q.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      {q.source.title}
                    </a>
                  ) : (
                    q.source.title
                  )}
                </p>
              )}
            </figure>
          </Reveal>
        ))}
      </div>
    )
  }

  if (kind === 'takeaways' || kind === 'today') {
    const items = parseList(body)
    return (
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <Reveal key={i} delay={i * 0.04}>
            <li className="flex gap-3.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              <span className="text-[14px] leading-relaxed text-bone-100">{item}</span>
            </li>
          </Reveal>
        ))}
      </ul>
    )
  }

  // summary / how / thinking — текстовые разделы
  return (
    <div className="space-y-4">
      {(body ?? '').split('\n\n').map((para, i) => (
        <Reveal key={i} delay={i * 0.04}>
          <p className="text-[15px] leading-[1.7] text-bone-200">{para}</p>
        </Reveal>
      ))}
    </div>
  )
}

function CaseRow({ label, text, accent }: { label: string; text: string; accent?: boolean }) {
  return (
    <div className="p-4">
      <p className={`eyebrow mb-2 ${accent ? 'text-[var(--accent)]' : ''}`}>{label}</p>
      <p className="text-[13.5px] leading-relaxed text-bone-200">{text}</p>
    </div>
  )
}

function ConfidenceTag({ value }: { value: string }) {
  if (value === 'high') return null
  return (
    <p className="mt-3 text-[10.5px] uppercase tracking-[0.1em] text-bone-600">
      {CONFIDENCE_LABELS[value] ?? ''}
    </p>
  )
}
