/**
 * npm run seed
 *
 * Идемпотентно загружает в базу:
 *  1. категории;
 *  2. master list (как черновики — status=draft);
 *  3. полные профили из content/people (с курсом, источниками и claims).
 *
 * Скрипт не выдумывает данные: всё берётся из файлов content/.
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { type Prisma } from "@prisma/client"
import { prisma } from "../src/lib/prisma"
import { categorySchema, personSchema, type PersonContent } from '../src/lib/content-schema'
import { readMasterList } from './lib/master-list'
import { buildSearchText, SECTION_TITLES } from '../src/lib/content-utils'

const ROOT = path.resolve(process.cwd(), 'content')

async function seedCategories() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'categories.json'), 'utf8'))
  const categories = raw.map((c: unknown) => categorySchema.parse(c))
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: c,
      update: c,
    })
  }
  console.log(`  категорий: ${categories.length}`)
  return categories.length
}

async function seedMasterList() {
  const entries = readMasterList()
  let created = 0
  for (const e of entries) {
    const existing = await prisma.person.findUnique({
      where: { slug: e.slug },
      select: { id: true, status: true },
    })
    // Не трогаем профили, которые уже обогащены и опубликованы.
    if (existing && existing.status !== 'draft') continue

    const data = {
      name: e.name,
      displayName: e.name,
      role: e.role,
      country: e.country,
      region: e.region || null,
      era: e.era,
      birthYear: e.birthYear ?? null,
      deathYear: e.deathYear ?? null,
      status: 'draft' as const,
      searchText: buildSearchText({
        name: e.name,
        role: e.role,
        country: e.country,
        region: e.region,
        categories: e.categories,
      }),
    }

    const person = await prisma.person.upsert({
      where: { slug: e.slug },
      create: { slug: e.slug, ...data },
      update: data,
    })
    if (!existing) created++

    await prisma.personCategory.deleteMany({ where: { personId: person.id } })
    for (const [i, slug] of e.categories.entries()) {
      const cat = await prisma.category.findUnique({ where: { slug } })
      if (!cat) continue
      await prisma.personCategory.create({
        data: { personId: person.id, categoryId: cat.id, isPrimary: i === 0 },
      })
    }
  }
  console.log(`  людей в master list: ${entries.length} (новых: ${created})`)
  return entries.length
}

async function seedPerson(content: PersonContent) {
  const searchText = buildSearchText({
    name: content.name,
    displayName: content.displayName,
    role: content.role,
    country: content.country,
    region: content.region,
    descriptor: content.descriptor,
    shortBio: content.shortBio,
    categories: content.categories,
    extra: [
      ...content.principles.map((p) => p.title),
      ...content.habits.map((h) => h.title),
      ...content.takeaways,
    ],
  })

  const data: Prisma.PersonUncheckedCreateInput = {
    slug: content.slug,
    name: content.name,
    displayName: content.displayName,
    role: content.role,
    descriptor: content.descriptor ?? null,
    country: content.country,
    region: content.region ?? null,
    era: content.era,
    birthYear: content.birthYear ?? null,
    deathYear: content.deathYear ?? null,
    shortBio: content.shortBio ?? null,
    status: content.status,
    confidence: content.confidence,
    publishedAt: content.status === 'published' ? new Date() : null,
    imageUrl: content.image?.url ?? null,
    imageSource: content.image?.source ?? null,
    imageCredit: content.image?.credit ?? null,
    imageAlt: content.image?.alt ?? null,
    imageWidth: content.image?.width ?? null,
    imageHeight: content.image?.height ?? null,
    searchText,
  }

  const person = await prisma.person.upsert({
    where: { slug: content.slug },
    create: data,
    update: { ...data, publishedAt: undefined },
  })

  // Полная перезапись контента человека — единственный источник истины это файл.
  await prisma.$transaction([
    prisma.fact.deleteMany({ where: { personId: person.id } }),
    prisma.principle.deleteMany({ where: { personId: person.id } }),
    prisma.habit.deleteMany({ where: { personId: person.id } }),
    prisma.quote.deleteMany({ where: { personId: person.id } }),
    prisma.caseStudy.deleteMany({ where: { personId: person.id } }),
    prisma.mistake.deleteMany({ where: { personId: person.id } }),
    prisma.claim.deleteMany({ where: { personId: person.id } }),
    prisma.source.deleteMany({ where: { personId: person.id } }),
    prisma.personCategory.deleteMany({ where: { personId: person.id } }),
  ])

  // Категории
  for (const [i, slug] of content.categories.entries()) {
    const cat = await prisma.category.findUnique({ where: { slug } })
    if (!cat) continue
    await prisma.personCategory.create({
      data: { personId: person.id, categoryId: cat.id, isPrimary: i === 0 },
    })
  }

  // Источники
  const sourceIds = new Map<string, string>()
  for (const s of content.sources) {
    const created = await prisma.source.create({
      data: {
        personId: person.id,
        title: s.title,
        author: s.author ?? null,
        publisher: s.publisher ?? null,
        url: s.url ?? null,
        publishedAt: s.publishedAt ?? null,
        type: s.type,
        notes: s.notes ?? null,
        reliability: s.reliability,
        accessedAt: new Date(),
      },
    })
    sourceIds.set(s.key, created.id)
  }

  /** Каждое существенное утверждение получает claim со ссылками на источники. */
  async function makeClaim(text: string, refs: string[], status: string, confidence: string) {
    const unique = [...new Set(refs)]
    if (unique.length === 0) return null
    const claim = await prisma.claim.create({
      data: {
        personId: person.id,
        text,
        status: status as never,
        confidence: confidence as never,
      },
    })
    for (const ref of unique) {
      const sourceId = sourceIds.get(ref)
      if (sourceId) {
        await prisma.claimSource.create({ data: { claimId: claim.id, sourceId } })
      }
    }
    return claim.id
  }

  for (const [i, f] of content.facts.entries()) {
    const claimId = await makeClaim(f.text, f.sources, f.status, f.confidence)
    await prisma.fact.create({
      data: {
        personId: person.id,
        text: f.text,
        context: f.context ?? null,
        sortOrder: i,
        status: f.status,
        confidence: f.confidence,
        claimId,
      },
    })
  }

  for (const [i, p] of content.principles.entries()) {
    const claimId = await makeClaim(p.title, p.sources, p.status, p.confidence)
    await prisma.principle.create({
      data: {
        personId: person.id,
        title: p.title,
        explanation: p.explanation ?? null,
        sortOrder: i,
        status: p.status,
        confidence: p.confidence,
        claimId,
      },
    })
  }

  for (const [i, h] of content.habits.entries()) {
    const claimId = await makeClaim(h.title, h.sources, h.status, h.confidence)
    await prisma.habit.create({
      data: {
        personId: person.id,
        title: h.title,
        description: h.description ?? null,
        principleTag: h.principleTag ?? null,
        timeOfDay: h.timeOfDay,
        durationMin: h.durationMin ?? null,
        sortOrder: i,
        status: h.status,
        confidence: h.confidence,
        claimId,
      },
    })
  }

  for (const [i, q] of content.quotes.entries()) {
    const refs = q.source ? [q.source, ...q.sources] : q.sources
    const claimId = await makeClaim(q.text, refs, q.status, q.confidence)
    await prisma.quote.create({
      data: {
        personId: person.id,
        text: q.text,
        context: q.context ?? null,
        isVerbatim: q.isVerbatim,
        sourceId: q.source ? (sourceIds.get(q.source) ?? null) : null,
        sortOrder: i,
        status: q.status,
        confidence: q.confidence,
        claimId,
      },
    })
  }

  for (const [i, c] of content.cases.entries()) {
    const claimId = await makeClaim(c.title, c.sources, c.status, c.confidence)
    await prisma.caseStudy.create({
      data: {
        personId: person.id,
        title: c.title,
        situation: c.situation,
        decision: c.decision,
        result: c.result,
        lesson: c.lesson,
        year: c.year ?? null,
        sortOrder: i,
        status: c.status,
        confidence: c.confidence,
        claimId,
      },
    })
  }

  for (const [i, m] of content.mistakes.entries()) {
    const claimId = await makeClaim(m.title, m.sources, m.status, m.confidence)
    await prisma.mistake.create({
      data: {
        personId: person.id,
        title: m.title,
        description: m.description,
        consequence: m.consequence ?? null,
        lesson: m.lesson ?? null,
        sortOrder: i,
        status: m.status,
        confidence: m.confidence,
        claimId,
      },
    })
  }

  // Курс и разделы
  const course = await prisma.course.upsert({
    where: { personId: person.id },
    create: { personId: person.id, intro: content.intro ?? null },
    update: { intro: content.intro ?? null },
  })

  const sections = buildSections(content)
  await prisma.courseSection.deleteMany({
    where: { courseId: course.id, kind: { notIn: sections.map((s) => s.kind) as never } },
  })
  for (const [i, s] of sections.entries()) {
    await prisma.courseSection.upsert({
      where: { courseId_kind: { courseId: course.id, kind: s.kind as never } },
      create: {
        courseId: course.id,
        kind: s.kind as never,
        title: s.title,
        subtitle: s.subtitle ?? null,
        body: s.body ?? null,
        sortOrder: i,
        status: content.status,
      },
      update: {
        title: s.title,
        subtitle: s.subtitle ?? null,
        body: s.body ?? null,
        sortOrder: i,
        status: content.status,
      },
    })
  }

  return person
}

/** Разделы курса: явно заданные в файле + автоматические из наполненных блоков. */
function buildSections(content: PersonContent) {
  const explicit = new Map(content.sections.map((s) => [s.kind, s]))
  const order = [
    'summary',
    'interesting',
    'how',
    'principles',
    'habits',
    'thinking',
    'cases',
    'mistakes',
    'quotes',
    'takeaways',
    'today',
  ] as const

  const has: Record<string, boolean> = {
    summary: true,
    interesting: content.facts.length > 0,
    how: true,
    principles: content.principles.length > 0,
    habits: content.habits.length > 0,
    thinking: true,
    cases: content.cases.length > 0,
    mistakes: content.mistakes.length > 0,
    quotes: content.quotes.length > 0,
    takeaways: content.takeaways.length > 0,
    today: content.today.length > 0,
  }

  return order
    .filter((kind) => explicit.has(kind) || has[kind])
    .map((kind) => {
      const e = explicit.get(kind)
      return {
        kind,
        title: e?.title ?? SECTION_TITLES[kind],
        subtitle: e?.subtitle,
        body:
          e?.body ??
          (kind === 'takeaways'
            ? content.takeaways.map((t) => `- ${t}`).join('\n')
            : kind === 'today'
              ? content.today.map((t) => `- ${t}`).join('\n')
              : undefined),
      }
    })
}

async function seedRelations() {
  const files = fs.readdirSync(path.join(ROOT, 'people')).filter((f) => f.endsWith('.json'))
  for (const file of files) {
    const content = personSchema.parse(
      JSON.parse(fs.readFileSync(path.join(ROOT, 'people', file), 'utf8')),
    )
    const from = await prisma.person.findUnique({ where: { slug: content.slug } })
    if (!from) continue
    await prisma.recommendation.deleteMany({ where: { fromId: from.id } })
    for (const [i, slug] of content.related.entries()) {
      const to = await prisma.person.findUnique({ where: { slug } })
      if (!to || to.id === from.id) continue
      await prisma.recommendation.create({
        data: { fromId: from.id, toId: to.id, weight: content.related.length - i },
      })
    }
  }
}

async function main() {
  console.log('\n  Загрузка контента MYSS\n  ─────────────────────────────────────────')
  await seedCategories()
  await seedMasterList()

  const peopleDir = path.join(ROOT, 'people')
  const files = fs.existsSync(peopleDir)
    ? fs.readdirSync(peopleDir).filter((f) => f.endsWith('.json'))
    : []

  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(peopleDir, file), 'utf8'))
    const parsed = personSchema.safeParse(raw)
    if (!parsed.success) {
      console.error(`  ОШИБКА в ${file}: контент не прошёл проверку, профиль пропущен`)
      for (const issue of parsed.error.issues) {
        console.error(`    - ${issue.path.join('.')}: ${issue.message}`)
      }
      continue
    }
    await seedPerson(parsed.data)
    console.log(`  профиль: ${parsed.data.slug} (${parsed.data.status})`)
  }

  await seedRelations()

  const published = await prisma.person.count({ where: { status: 'published' } })
  const total = await prisma.person.count()
  console.log(`\n  Итого в базе: ${total}, опубликовано: ${published}\n`)
}

main()
  .catch((e) => {
    console.error('  Загрузка не удалась:', e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
