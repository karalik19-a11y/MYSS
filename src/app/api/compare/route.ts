import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fail, handleError, ok } from '@/server/http'

export const dynamic = 'force-dynamic'

/** Сравнение 2–3 человек по практическим параметрам (§17). */
export async function GET(req: NextRequest) {
  try {
    const slugs = (req.nextUrl.searchParams.get('slugs') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3)

    if (slugs.length < 2) {
      return fail('Выбери двух или трёх человек для сравнения.', 400, 'need_two')
    }

    const people = await prisma.person.findMany({
      where: { slug: { in: slugs }, status: 'published' },
      include: {
        principles: { where: { status: 'published' }, orderBy: { sortOrder: 'asc' } },
        habits: { where: { status: 'published' }, orderBy: { sortOrder: 'asc' } },
        mistakes: { where: { status: 'published' }, orderBy: { sortOrder: 'asc' }, take: 1 },
        cases: { where: { status: 'published' }, orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    })

    const byTag = (p: (typeof people)[number], tags: string[]) =>
      p.habits.filter((h) => h.principleTag && tags.includes(h.principleTag)).map((h) => h.title)

    const rows = [
      {
        key: 'work',
        label: 'Работа',
        values: people.map((p) => byTag(p, ['deep_work', 'craft', 'early_start'])),
      },
      {
        key: 'discipline',
        label: 'Дисциплина',
        values: people.map((p) => byTag(p, ['planning', 'no_distraction', 'rest'])),
      },
      {
        key: 'risk',
        label: 'Риск',
        values: people.map((p) => p.mistakes.map((m) => m.lesson ?? m.title)),
      },
      {
        key: 'learning',
        label: 'Обучение',
        values: people.map((p) => byTag(p, ['reading', 'reflection'])),
      },
      {
        key: 'decisions',
        label: 'Решения',
        values: people.map((p) => p.principles.slice(0, 2).map((x) => x.title)),
      },
    ]

    return ok({
      people: people.map((p) => ({
        slug: p.slug,
        displayName: p.displayName,
        role: p.role,
        imageUrl: p.imageUrl,
        imageAlt: p.imageAlt,
      })),
      rows,
    })
  } catch (error) {
    return handleError('api.compare', error)
  }
}
