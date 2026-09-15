import { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/server/auth'
import { fail, handleError, ok, readJson } from '@/server/http'
import { buildSearchText } from '@/lib/content-utils'
import { logger } from '@/lib/logger'
import { CONFIDENCE, CONTENT_STATUS, ERAS } from '@/lib/content-schema'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  displayName: z.string().min(2).optional(),
  role: z.string().min(2).optional(),
  descriptor: z.string().max(220).nullable().optional(),
  country: z.string().min(2).optional(),
  region: z.string().nullable().optional(),
  era: z.enum(ERAS).optional(),
  birthYear: z.number().int().nullable().optional(),
  deathYear: z.number().int().nullable().optional(),
  shortBio: z.string().max(400).nullable().optional(),
  status: z.enum(CONTENT_STATUS).optional(),
  confidence: z.enum(CONFIDENCE).optional(),
  categories: z.array(z.string()).optional(),
  image: z
    .object({
      url: z.string().url(),
      source: z.string().optional(),
      credit: z.string().optional(),
      alt: z.string().min(3),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
    })
    .nullable()
    .optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await requireAdmin(req)
    const { slug } = await params
    const person = await prisma.person.findUnique({
      where: { slug },
      include: {
        categories: { include: { category: true } },
        course: { include: { sections: { orderBy: { sortOrder: 'asc' } } } },
        facts: { orderBy: { sortOrder: 'asc' } },
        principles: { orderBy: { sortOrder: 'asc' } },
        habits: { orderBy: { sortOrder: 'asc' } },
        quotes: { orderBy: { sortOrder: 'asc' }, include: { source: true } },
        cases: { orderBy: { sortOrder: 'asc' } },
        mistakes: { orderBy: { sortOrder: 'asc' } },
        sources: true,
        claims: { include: { sources: { include: { source: true } } } },
      },
    })
    if (!person) return fail('Такого человека нет в базе.', 404, 'not_found')
    return ok(person)
  } catch (error) {
    return handleError('api.admin.person.get', error)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const admin = await requireAdmin(req)
    const { slug } = await params
    const body = updateSchema.parse(await readJson(req))

    const existing = await prisma.person.findUnique({
      where: { slug },
      include: { categories: { include: { category: true } } },
    })
    if (!existing) return fail('Такого человека нет в базе.', 404, 'not_found')

    // Публикация только при наличии источников и изображения (§9, §29).
    if (body.status === 'published') {
      const [sources, facts] = await Promise.all([
        prisma.source.count({ where: { personId: existing.id } }),
        prisma.fact.count({ where: { personId: existing.id } }),
      ])
      const imageUrl = body.image?.url ?? existing.imageUrl
      if (sources === 0) return fail('Нельзя опубликовать профиль без источников.', 422, 'no_sources')
      if (facts === 0) return fail('Нельзя опубликовать профиль без фактов.', 422, 'no_facts')
      if (!imageUrl) return fail('Нельзя опубликовать профиль без изображения.', 422, 'no_image')
    }

    const person = await prisma.person.update({
      where: { slug },
      data: {
        name: body.name,
        displayName: body.displayName,
        role: body.role,
        descriptor: body.descriptor,
        country: body.country,
        region: body.region,
        era: body.era,
        birthYear: body.birthYear,
        deathYear: body.deathYear,
        shortBio: body.shortBio,
        status: body.status,
        confidence: body.confidence,
        publishedAt:
          body.status === 'published' ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
        ...(body.image !== undefined
          ? body.image === null
            ? {
                imageUrl: null,
                imageSource: null,
                imageCredit: null,
                imageAlt: null,
                imageWidth: null,
                imageHeight: null,
              }
            : {
                imageUrl: body.image.url,
                imageSource: body.image.source ?? null,
                imageCredit: body.image.credit ?? null,
                imageAlt: body.image.alt,
                imageWidth: body.image.width ?? null,
                imageHeight: body.image.height ?? null,
              }
          : {}),
        searchText: buildSearchText({
          name: body.name ?? existing.name,
          displayName: body.displayName ?? existing.displayName,
          role: body.role ?? existing.role,
          country: body.country ?? existing.country,
          region: body.region ?? existing.region ?? undefined,
          descriptor: body.descriptor ?? existing.descriptor ?? undefined,
          shortBio: body.shortBio ?? existing.shortBio ?? undefined,
          categories:
            body.categories ?? existing.categories.map((c) => c.category.slug),
        }),
      },
    })

    if (body.categories) {
      await prisma.personCategory.deleteMany({ where: { personId: person.id } })
      for (const [i, catSlug] of body.categories.entries()) {
        const cat = await prisma.category.findUnique({ where: { slug: catSlug } })
        if (cat) {
          await prisma.personCategory.create({
            data: { personId: person.id, categoryId: cat.id, isPrimary: i === 0 },
          })
        }
      }
    }

    // Публичные страницы читают контент из кэша — после правки его нужно
    // сбросить, иначе изменения не появятся до истечения срока хранения.
    revalidateTag('content')

    logger.info('admin.person_updated', {
      adminId: admin.id,
      slug,
      status: body.status ?? existing.status,
    })
    return ok(person)
  } catch (error) {
    return handleError('api.admin.person.patch', error)
  }
}
