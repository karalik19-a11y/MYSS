'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import type { PersonCard } from '@/server/queries'
import { api, haptic } from '@/lib/telegram'
import { EmptyState, Reveal, Skeleton } from './ui'
import { IconArrow, IconCheck, IconClose } from './Icons'

interface RoutineItem {
  id: string
  startTime: string
  endTime: string
  title: string
  detail?: string | null
  ideaSource?: string | null
  whyThisPerson?: string | null
  howAdapted?: string | null
}

interface Routine {
  id: string
  title: string
  createdAt: string
  person: { slug: string; displayName: string; imageUrl?: string | null; imageAlt?: string | null }
  items: RoutineItem[]
}

export function DayPlanner({ people }: { people: PersonCard[] }) {
  const searchParams = useSearchParams()
  const [routines, setRoutines] = useState<Routine[] | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<string | null>(searchParams.get('person'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [form, setForm] = useState({
    wakeTime: '07:00',
    sleepTime: '23:30',
    workStart: '10:00',
    workEnd: '19:00',
    commuteMin: 30,
    mealsPerDay: 3,
    trainingMin: 45,
    studyMin: 30,
    freeTimeMin: 60,
  })

  useEffect(() => {
    api<Routine[]>('/api/routine')
      .then(setRoutines)
      .catch(() => setRoutines([]))
  }, [])

  useEffect(() => {
    if (searchParams.get('person')) setShowForm(true)
  }, [searchParams])

  async function generate() {
    if (!selected || busy) return
    setBusy(true)
    setError(null)
    haptic.tap()
    try {
      const res = await api<{ routine: Routine }>('/api/routine/generate', {
        method: 'POST',
        body: JSON.stringify({ personSlug: selected, ...form }),
      })
      setRoutines((prev) => [res.routine, ...(prev ?? [])])
      setShowForm(false)
      setExpanded(res.routine.id)
      haptic.success()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не получилось собрать день. Попробуй ещё раз.')
      haptic.warning()
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    haptic.tap()
    setRoutines((prev) => (prev ?? []).filter((r) => r.id !== id))
    try {
      await api(`/api/routine/${id}`, { method: 'DELETE' })
    } catch {
      /* список обновится при следующей загрузке */
    }
  }

  return (
    <main className="container-app pt-6">
      <header className="pb-6 pt-2">
        <p className="eyebrow">Практика</p>
        <h1 className="display mt-3 text-[32px] text-bone-50">Мой день</h1>
        <p className="mt-3 max-w-[42ch] text-[13.5px] leading-relaxed text-bone-400">
          Не копия чужого расписания. Из подтверждённых привычек берётся принцип и раскладывается
          под твои часы, работу и ограничения.
        </p>
      </header>

      {!showForm && (
        <button
          onClick={() => {
            haptic.tap()
            setShowForm(true)
          }}
          className="tap w-full justify-between rounded-2xl bg-bone-50 px-5 text-[14px] font-medium text-ink-950"
        >
          Собрать новый день
          <IconArrow size={16} />
        </button>
      )}

      {/* Форма */}
      <AnimatePresence>
        {showForm && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[15px] font-medium text-bone-50">Твои ограничения</h2>
                <button
                  onClick={() => setShowForm(false)}
                  aria-label="Закрыть"
                  className="tap text-bone-600"
                >
                  <IconClose size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Подъём">
                  <TimeInput
                    value={form.wakeTime}
                    onChange={(v) => setForm({ ...form, wakeTime: v })}
                  />
                </Field>
                <Field label="Сон">
                  <TimeInput
                    value={form.sleepTime}
                    onChange={(v) => setForm({ ...form, sleepTime: v })}
                  />
                </Field>
                <Field label="Работа с">
                  <TimeInput
                    value={form.workStart}
                    onChange={(v) => setForm({ ...form, workStart: v })}
                  />
                </Field>
                <Field label="Работа до">
                  <TimeInput
                    value={form.workEnd}
                    onChange={(v) => setForm({ ...form, workEnd: v })}
                  />
                </Field>
                <Field label="Дорога, мин">
                  <NumInput
                    value={form.commuteMin}
                    onChange={(v) => setForm({ ...form, commuteMin: v })}
                  />
                </Field>
                <Field label="Приёмов пищи">
                  <NumInput
                    value={form.mealsPerDay}
                    min={1}
                    max={6}
                    onChange={(v) => setForm({ ...form, mealsPerDay: v })}
                  />
                </Field>
                <Field label="Тренировка, мин">
                  <NumInput
                    value={form.trainingMin}
                    onChange={(v) => setForm({ ...form, trainingMin: v })}
                  />
                </Field>
                <Field label="Учёба, мин">
                  <NumInput
                    value={form.studyMin}
                    onChange={(v) => setForm({ ...form, studyMin: v })}
                  />
                </Field>
                <Field label="Свободное, мин">
                  <NumInput
                    value={form.freeTimeMin}
                    onChange={(v) => setForm({ ...form, freeTimeMin: v })}
                  />
                </Field>
              </div>

              <p className="eyebrow mb-3 mt-6">Чей подход взять за основу</p>
              <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5">
                {people.map((p) => (
                  <button
                    key={p.slug}
                    onClick={() => {
                      haptic.select()
                      setSelected(p.slug)
                    }}
                    className={`relative w-[90px] shrink-0 overflow-hidden rounded-xl border transition-colors duration-250 ${
                      selected === p.slug ? 'border-[var(--accent)]' : 'border-[var(--line)]'
                    }`}
                  >
                    <div className="relative aspect-[3/4] bg-ink-800">
                      {p.imageUrl && (
                        <Image
                          src={p.imageUrl}
                          alt={p.imageAlt ?? p.displayName}
                          fill
                          sizes="90px"
                          className="object-cover object-top"
                        />
                      )}
                      {selected === p.slug && (
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

              {error && <p className="mt-4 text-[12.5px] text-[var(--accent)]">{error}</p>}

              <button
                onClick={generate}
                disabled={!selected || busy}
                className="tap mt-5 w-full rounded-xl bg-[var(--accent)] text-[14px] font-medium text-white disabled:opacity-40"
              >
                {busy ? 'Собираем' : 'Собрать день'}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Сохранённые распорядки */}
      <section className="py-8">
        {routines === null ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : routines.length === 0 && !showForm ? (
          <EmptyState
            title="Пока нет ни одного дня"
            description="Расскажи о своём графике и выбери человека — соберём распорядок по его принципам."
          />
        ) : (
          <div className="space-y-4">
            {routines.map((r) => (
              <Reveal key={r.id}>
                <article className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
                  <button
                    onClick={() => {
                      haptic.tap()
                      setExpanded(expanded === r.id ? null : r.id)
                    }}
                    className="flex w-full items-center gap-3.5 p-4 text-left"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-800">
                      {r.person.imageUrl && (
                        <Image
                          src={r.person.imageUrl}
                          alt={r.person.imageAlt ?? r.person.displayName}
                          fill
                          sizes="48px"
                          className="object-cover object-top"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-bone-50">{r.title}</p>
                      <p className="text-[11.5px] text-bone-600">{r.items.length} блоков</p>
                    </div>
                  </button>

                  <AnimatePresence>
                    {expanded === r.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden border-t border-[var(--line)]"
                      >
                        <ol className="divide-y divide-[var(--line)]">
                          {r.items.map((item) => (
                            <li key={item.id} className="p-4">
                              <div className="flex gap-3.5">
                                <span className="shrink-0 pt-0.5 text-[11.5px] tabular-nums text-bone-600">
                                  {item.startTime}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[14px] text-bone-50">{item.title}</p>
                                  {item.detail && (
                                    <p className="mt-1 text-[12.5px] leading-relaxed text-bone-400">
                                      {item.detail}
                                    </p>
                                  )}
                                  {(item.ideaSource || item.whyThisPerson || item.howAdapted) && (
                                    <div className="mt-3 space-y-1.5 border-l border-[var(--line)] pl-3">
                                      {item.ideaSource && (
                                        <Origin label="Источник идеи" text={item.ideaSource} />
                                      )}
                                      {item.whyThisPerson && (
                                        <Origin
                                          label="Почему это связано"
                                          text={item.whyThisPerson}
                                        />
                                      )}
                                      {item.howAdapted && (
                                        <Origin label="Как адаптировано" text={item.howAdapted} />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ol>
                        <div className="p-4">
                          <button
                            onClick={() => remove(r.id)}
                            className="tap w-full rounded-xl border border-[var(--line)] text-[13px] text-bone-400"
                          >
                            Удалить распорядок
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function Origin({ label, text }: { label: string; text: string }) {
  return (
    <p className="text-[11.5px] leading-relaxed text-bone-600">
      <span className="text-bone-400">{label}. </span>
      {text}
    </p>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] text-bone-600">{label}</span>
      {children}
    </label>
  )
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[14px] text-bone-50 focus:border-bone-600 focus:outline-none"
    />
  )
}

function NumInput({
  value,
  onChange,
  min = 0,
  max = 480,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
      className="h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[14px] text-bone-50 focus:border-bone-600 focus:outline-none"
    />
  )
}
