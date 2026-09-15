import { NextRequest } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/server/auth'
import { handleError, ok, readJson } from '@/server/http'
import { buildSearchText } from '@/lib/content-utils'
import { logger } from '@/lib/logger'
import { CONFIDENCE, CONTENT_STATUS, ERAS } from '@/lib/content-schema'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug: строчные латинские буквы, цифры и дефис'),
  name: z.string().min(2),
  displayName: z.string().min(2).optional(),
  role: z.string().min(2),
  descriptor: z.string().max(220).optional(),
  country: z.string().min(2),
  region: z.string().optional(),
  era: z.enum(ERAS).default('contemporary'),
  birthYear: z.number().int().optional(),
  deathYear: z.number().int().optional(),
  shortBio: z.string().max(400).optional(),
  status: z.enum(CONTENT_STATUS).default('draft'),
  confidence: z.enum(CONFIDENCE).default('medium'),
  categories: z.array(z.string()).default([]),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const sp = req.nextUrl.searchParams
    const q = (sp.get('q') ?? '').trim().toLowerCase()
    const status = sp.get('status')
    const page = Math.max(Number(sp.get('page') ?? 1), 1)
    const perPage = 30

    const where: Prisma.PersonWhereInput = {}
    if (q) where.searchText = { contains: q }
    if (status) where.status = status as Prisma.PersonWhereInput['status']

    const [items, total, counts] = await Promise.all([
      prisma.person.findMany({
        where,
        orderBy: [{ status: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          slug: true,
          name: true,
          role: true,
          country: true,
          status: true,
          confidence: true,
          imageUrl: true,
          _count: { select: { facts: true, quotes: true, sources: true, claims: true } },
        },
      }),
      prisma.person.count({ where }),
      prisma.person.groupBy({ by: ['status'], _count: { status: true } }),
    ])

    return ok({
      items,
      total,
      page,
      perPage,
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count.status])),
    })
  } catch (error) {
    return handleError('api.admin.people.get', error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const body = createSchema.parse(await readJson(req))

    const person = await prisma.person.create({
      data: {
        slug: body.slug,
        name: body.name,
        displayName: body.displayName ?? body.name,
        role: body.role,
        descriptor: body.descriptor ?? null,
        country: body.country,
        region: body.region ?? null,
        era: body.era,
        birthYear: body.birthYear ?? null,
        deathYear: body.deathYear ?? null,
        shortBio: body.shortBio ?? null,
        status: body.status,
        confidence: body.confidence,
        searchText: buildSearchText({
          name: body.name,
          role: body.role,
          country: body.country,
          region: body.region,
          descriptor: body.descriptor,
          categories: body.categories,
        }),
      },
    })

    for (const [i, slug] of body.categories.entries()) {
      const cat = await prisma.category.findUnique({ where: { slug } })
      if (cat) {
        await prisma.personCategory.create({
          data: { personId: person.id, categoryId: cat.id, isPrimary: i === 0 },
        })
      }
    }

    logger.info('admin.person_created', { adminId: admin.id, slug: person.slug })
    return ok(person, { status: 201 })
  } catch (error) {
    return handleError('api.admin.people.post', error)
  }
}
