import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/server/auth'
import { fail, handleError, ok, readJson } from '@/server/http'
import { recordEvent } from '@/server/queries'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  kind: z.enum(['person', 'quote', 'case_study', 'principle']),
  targetId: z.string().min(1),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const personSelect = {
      slug: true,
      displayName: true,
      role: true,
      imageUrl: true,
      imageAlt: true,
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        person: { select: personSelect },
        quote: { include: { person: { select: personSelect }, source: true } },
        caseStudy: { include: { person: { select: personSelect } } },
        principle: { include: { person: { select: personSelect } } },
      },
    })

    return ok({
      people: favorites.filter((f) => f.kind === 'person'),
      quotes: favorites.filter((f) => f.kind === 'quote'),
      cases: favorites.filter((f) => f.kind === 'case_study'),
      principles: favorites.filter((f) => f.kind === 'principle'),
      total: favorites.length,
    })
  } catch (error) {
    return handleError('api.favorites.get', error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const { kind, targetId } = bodySchema.parse(await readJson(req))

    // Проверяем, что объект существует и опубликован.
    const data: {
      userId: string
      kind: typeof kind
      personId?: string
      quoteId?: string
      caseId?: string
      principleId?: string
    } = { userId: user.id, kind }

    let personId: string | undefined
    if (kind === 'person') {
      const p = await prisma.person.findFirst({
        where: { OR: [{ id: targetId }, { slug: targetId }], status: 'published' },
        select: { id: true },
      })
      if (!p) return fail('Не нашли, что сохранить.', 404, 'not_found')
      data.personId = p.id
      personId = p.id
    } else if (kind === 'quote') {
      const q = await prisma.quote.findFirst({
        where: { id: targetId, status: 'published' },
        select: { id: true, personId: true },
      })
      if (!q) return fail('Не нашли, что сохранить.', 404, 'not_found')
      data.quoteId = q.id
      personId = q.personId
    } else if (kind === 'case_study') {
      const c = await prisma.caseStudy.findFirst({
        where: { id: targetId, status: 'published' },
        select: { id: true, personId: true },
      })
      if (!c) return fail('Не нашли, что сохранить.', 404, 'not_found')
      data.caseId = c.id
      personId = c.personId
    } else {
      const p = await prisma.principle.findFirst({
        where: { id: targetId, status: 'published' },
        select: { id: true, personId: true },
      })
      if (!p) return fail('Не нашли, что сохранить.', 404, 'not_found')
      data.principleId = p.id
      personId = p.personId
    }

    const existing = await prisma.favorite.findFirst({
      where: {
        userId: user.id,
        kind,
        personId: data.personId ?? null,
        quoteId: data.quoteId ?? null,
        caseId: data.caseId ?? null,
        principleId: data.principleId ?? null,
      },
    })
    if (existing) return ok({ id: existing.id, created: false })

    const favorite = await prisma.favorite.create({ data })
    await recordEvent('favorite', personId, user.id)
    return ok({ id: favorite.id, created: true }, { status: 201 })
  } catch (error) {
    return handleError('api.favorites.post', error)
  }
}
