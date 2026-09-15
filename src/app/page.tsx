import Link from 'next/link'
import { listCategories, listPeople } from '@/server/queries'
import { PersonCard } from '@/components/PersonCard'
import { Reveal, SectionTitle } from '@/components/ui'
import { IconArrow, IconSearch, IconShuffle } from '@/components/Icons'
import { ContinueStrip } from '@/components/ContinueStrip'
import { RandomButton } from '@/components/RandomButton'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [featured, fresh, categories] = await Promise.all([
    listPeople({ sort: 'recommended', perPage: 6 }),
    listPeople({ sort: 'new', perPage: 4 }),
    listCategories(),
  ])

  const activeCategories = categories.filter((c) => c.count > 0)

  return (
    <main className="container-app pt-6">
      {/* HERO */}
      <section className="relative pb-10 pt-6">
        <Reveal>
          <p className="eyebrow">MYSS — Make Yourself Super Smart</p>
        </Reveal>

        <Reveal delay={0.05}>
          <h1 className="display mt-5 text-[40px] leading-[0.95] text-bone-50 sm:text-[52px]">
            Как они это
            <br />
            <span className="text-[var(--accent)]">делали</span> на самом деле
          </h1>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mt-5 max-w-[40ch] text-[15px] leading-relaxed text-bone-400">
            Собрали самое полезное из опыта людей, которые делали это по-настоящему. Принципы,
            решения, ошибки — и то, что можно попробовать сегодня.
          </p>
        </Reveal>

        {/* Главный CTA — виден на первом экране (§4) */}
        <Reveal delay={0.15}>
          <Link
            href="/people"
            className="group mt-8 flex items-center justify-between gap-4 rounded-2xl bg-[var(--accent)] px-5 py-4 transition-transform duration-300 ease-editorial active:scale-[0.985]"
          >
            <span>
              <span className="block text-[16px] font-semibold text-white">
                Временно полностью бесплатно
              </span>
              <span className="mt-0.5 block text-[12px] text-white/75">
                Весь доступ открыт — без подписки и оплаты
              </span>
            </span>
            <IconArrow className="shrink-0 text-white transition-transform duration-300 group-active:translate-x-1" />
          </Link>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link
              href="/people?focus=search"
              className="tap justify-start gap-2.5 rounded-2xl border border-[var(--line)] px-4 text-[13.5px] text-bone-200"
            >
              <IconSearch size={17} className="text-bone-400" />
              Поиск
            </Link>
            <RandomButton />
          </div>
        </Reveal>
      </section>

      {/* Продолжить изучение */}
      <ContinueStrip />

      {/* Люди, которых стоит узнать */}
      {featured.items.length > 0 && (
        <section className="py-8">
          <Reveal>
            <SectionTitle
              eyebrow="Библиотека"
              title="Люди, которых стоит узнать"
              action={
                <Link href="/people" className="text-[12.5px] text-bone-400">
                  Все
                </Link>
              }
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-3">
            {featured.items.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.05}>
                <PersonCard person={p} priority={i < 2} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Категории */}
      {activeCategories.length > 0 && (
        <section className="py-8">
          <Reveal>
            <SectionTitle eyebrow="Направления" title="С чего начать" />
          </Reveal>
          <Reveal delay={0.05}>
            <div className="grid grid-cols-2 gap-2.5">
              {activeCategories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/people?category=${c.slug}`}
                  className="group flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 transition-colors duration-300 active:bg-ink-800"
                >
                  <span className="text-[13.5px] text-bone-100">{c.name}</span>
                  <span className="text-[11px] text-bone-600">{c.count}</span>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* Новые */}
      {fresh.items.length > 0 && (
        <section className="py-8">
          <Reveal>
            <SectionTitle eyebrow="Пополнение" title="Новые в библиотеке" />
          </Reveal>
          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
            {fresh.items.map((p) => (
              <div key={p.slug} className="w-[46%] shrink-0">
                <PersonCard person={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Мой день */}
      <section className="py-8">
        <Reveal>
          <Link
            href="/day"
            className="block rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface)] p-6 transition-transform duration-300 active:scale-[0.99]"
          >
            <p className="eyebrow">Мой день</p>
            <h3 className="display mt-3 text-[22px] leading-tight text-bone-50">
              Собери распорядок по принципам, а не по чужим часам
            </h3>
            <p className="mt-3 max-w-[42ch] text-[13.5px] leading-relaxed text-bone-400">
              Расскажи о своём графике и выбери человека. Мы возьмём из его подтверждённых привычек
              принцип и разложим под твои ограничения.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-[13px] text-[var(--accent)]">
              Собрать день
              <IconArrow size={16} />
            </span>
          </Link>
        </Reveal>
      </section>

      <div className="h-6" />
    </main>
  )
}
