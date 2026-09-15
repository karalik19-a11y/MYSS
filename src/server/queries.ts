import { unstable_cache } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/** В публичный интерфейс попадает только опубликованный контент (§29). */
const PUBLISHED = { status: 'published' as const }

export const personCardSelect = {
  id: true,
  slug: true,
  name: true,
  displayName: true,
  role: true,
  descriptor: true,
  shortBio: true,
  country: true,
  era: true,
  birthYear: true,
  deathYear: true,
  imageUrl: true,
  imageAlt: true,
  imageWidth: true,
  imageHeight: true,
  categories: {
    select: { isPrimary: true, category: { select: { slug: true, name: true, accent: true } } },
  },
} satisfies Prisma.PersonSelect

export type PersonCard = Prisma.PersonGetPayload<{ select: typeof personCardSelect }>

export interface PeopleQuery {
  category?: string
  country?: string
  era?: string
  q?: string
  sort?: 'recommended' | 'popular' | 'new' | 'name'
  page?: number
  perPage?: number
}

export async function listPeople(params: PeopleQuery) {
  const perPage = Math.min(Math.max(params.perPage ?? 20, 1), 50)
  const page = Math.max(params.page ?? 1, 1)

  const where: Prisma.PersonWhereInput = { ...PUBLISHED }
  if (params.category) {
    where.categories = { some: { category: { slug: params.category } } }
  }
  if (params.country) where.country = params.country
  if (params.era) where.era = params.era as Prisma.PersonWhereInput['era']
  if (params.q && params.q.trim().length > 0) {
    where.searchText = { contains: params.q.trim().toLowerCase() }
  }

  let orderBy: Prisma.PersonOrderByWithRelationInput[] = [{ name: 'asc' }]
  if (params.sort === 'new') orderBy = [{ publishedAt: 'desc' }, { name: 'asc' }]
  if (params.sort === 'name') orderBy = [{ name: 'asc' }]
  if (params.sort === 'recommended') orderBy = [{ confidence: 'asc' }, { name: 'asc' }]

  // «Популярное» строится только на реальных событиях (§14, §40).
  if (params.sort === 'popular') {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const top = await prisma.usageEvent.groupBy({
      by: ['personId'],
      where: { type: 'person_view', createdAt: { gte: since }, personId: { not: null } },
      _count: { personId: true },
      orderBy: { _count: { personId: 'desc' } },
      take: perPage * page,
    })
    const ids = top.map((t) => t.personId!).filter(Boolean)
    if (ids.length > 0) {
      const people = await prisma.person.findMany({
        where: { ...where, id: { in: ids } },
        select: personCardSelect,
      })
      const order = new Map(ids.map((id, i) => [id, i]))
      people.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      const total = people.length
      return { items: people.slice((page - 1) * perPage, page * perPage), total, page, perPage }
    }
    // Нет данных об использовании — не выдумываем популярность.
    orderBy = [{ name: 'asc' }]
  }

  const [items, total] = await Promise.all([
    prisma.person.findMany({
      where,
      select: personCardSelect,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.person.count({ where }),
  ])

  return { items, total, page, perPage }
}

/**
 * Страница человека — самый тяжёлый запрос в приложении (курс, разделы,
 * цитаты, кейсы, источники). Содержимое меняется только через админку,
 * поэтому результат кэшируется и сбрасывается по тегу при публикации.
 */
export const getPersonBySlug = unstable_cache(
  async function getPersonBySlug(slug: string) {
  return prisma.person.findFirst({
    where: { slug, ...PUBLISHED },
    include: {
      categories: { include: { category: true } },
      course: {
        include: {
          sections: {
            where: PUBLISHED,
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
      facts: { where: PUBLISHED, orderBy: { sortOrder: 'asc' } },
      principles: { where: PUBLISHED, orderBy: { sortOrder: 'asc' } },
      habits: { where: PUBLISHED, orderBy: { sortOrder: 'asc' } },
      quotes: {
        where: PUBLISHED,
        orderBy: { sortOrder: 'asc' },
        include: { source: true },
      },
      cases: { where: PUBLISHED, orderBy: { sortOrder: 'asc' } },
      mistakes: { where: PUBLISHED, orderBy: { sortOrder: 'asc' } },
      sources: { orderBy: { title: 'asc' } },
    },
  })
  },
  ['person'],
  { revalidate: 300, tags: ['content'] },
)

export type PersonDetail = NonNullable<Awaited<ReturnType<typeof getPersonBySlug>>>

/**
 * Категории и их счётчики меняются только при публикации контента, поэтому
 * результат переиспользуется вместо запроса к базе на каждый показ страницы.
 */
export const listCategories = unstable_cache(
  async function listCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { people: { where: { person: PUBLISHED } } } },
    },
  })
  return categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    accent: c.accent,
    count: c._count.people,
  }))
  },
  ['categories'],
  { revalidate: 300, tags: ['content'] },
)

export async function randomPerson(excludeSlug?: string) {
  const where: Prisma.PersonWhereInput = { ...PUBLISHED }
  if (excludeSlug) where.slug = { not: excludeSlug }
  const count = await prisma.person.count({ where })
  if (count === 0) return null
  const skip = Math.floor(Math.random() * count)
  const [person] = await prisma.person.findMany({
    where,
    select: personCardSelect,
    skip,
    take: 1,
  })
  return person ?? null
}

/** Рекомендации: явные связи из контента + совпадение по категориям. */
export async function getRecommendations(personId: string, limit = 6) {
  const explicit = await prisma.recommendation.findMany({
    where: { fromId: personId, to: PUBLISHED },
    orderBy: { weight: 'desc' },
    take: limit,
    include: { to: { select: personCardSelect } },
  })
  const items = explicit.map((r) => r.to)
  if (items.length >= limit) return items

  const cats = await prisma.personCategory.findMany({
    where: { personId },
    select: { categoryId: true },
  })
  const more = await prisma.person.findMany({
    where: {
      ...PUBLISHED,
      id: { not: personId, notIn: items.map((i) => i.id) },
      categories: { some: { categoryId: { in: cats.map((c) => c.categoryId) } } },
    },
    select: personCardSelect,
    take: limit - items.length,
  })
  return [...items, ...more]
}

/** Персональные рекомендации по интересам и истории пользователя. */
export async function getPersonalRecommendations(userId: string, limit = 6) {
  const [progress, favorites] = await Promise.all([
    prisma.userProgress.findMany({
      where: { userId },
      select: { personId: true },
      take: 50,
    }),
    prisma.favorite.findMany({
      where: { userId, kind: 'person' },
      select: { personId: true },
      take: 50,
    }),
  ])
  const seen = new Set(
    [...progress.map((p) => p.personId), ...favorites.map((f) => f.personId)].filter(
      Boolean,
    ) as string[],
  )
  if (seen.size === 0) return []

  const cats = await prisma.personCategory.findMany({
    where: { personId: { in: [...seen] } },
    select: { categoryId: true },
  })
  const categoryIds = [...new Set(cats.map((c) => c.categoryId))]
  if (categoryIds.length === 0) return []

  return prisma.person.findMany({
    where: {
      ...PUBLISHED,
      id: { notIn: [...seen] },
      categories: { some: { categoryId: { in: categoryIds } } },
    },
    select: personCardSelect,
    take: limit,
  })
}

export async function getUserProgress(userId: string, personId?: string) {
  return prisma.userProgress.findMany({
    where: { userId, ...(personId ? { personId } : {}) },
    include: { person: { select: personCardSelect } },
    orderBy: { updatedAt: 'desc' },
  })
}

/** Пересчёт прогресса по числу завершённых разделов курса. */
export async function recalcProgress(userId: string, personId: string) {
  const course = await prisma.course.findUnique({
    where: { personId },
    include: { sections: { where: PUBLISHED, select: { id: true } } },
  })
  const total = course?.sections.length ?? 0
  if (total === 0) return null

  const done = await prisma.userCompletedSection.count({
    where: { userId, sectionId: { in: course!.sections.map((s) => s.id) } },
  })
  const percent = Math.round((done / total) * 100)

  return prisma.userProgress.upsert({
    where: { userId_personId: { userId, personId } },
    create: {
      userId,
      personId,
      percent,
      completedAt: percent === 100 ? new Date() : null,
    },
    update: {
      percent,
      completedAt: percent === 100 ? new Date() : null,
    },
  })
}

export async function recordEvent(type: string, personId?: string, userId?: string) {
  try {
    await prisma.usageEvent.create({ data: { type, personId, userId } })
  } catch {
    // Аналитика не должна ломать пользовательский сценарий.
  }
}
