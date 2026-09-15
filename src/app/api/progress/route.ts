import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/server/auth'
import { handleError, ok, readJson } from '@/server/http'
import { recalcProgress, recordEvent } from '@/server/queries'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  personSlug: z.string().min(1),
  sectionId: z.string().min(1),
  completed: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const slug = req.nextUrl.searchParams.get('personSlug')

    if (slug) {
      const person = await prisma.person.findUnique({ where: { slug }, select: { id: true } })
      if (!person) return ok({ percent: 0, completedSections: [] })

      const course = await prisma.course.findUnique({
        where: { personId: person.id },
        include: { sections: { where: { status: 'published' }, select: { id: true } } },
      })
      const ids = course?.sections.map((s) => s.id) ?? []
      const done = await prisma.userCompletedSection.findMany({
        where: { userId: user.id, sectionId: { in: ids } },
        select: { sectionId: true },
      })
      const progress = await prisma.userProgress.findUnique({
        where: { userId_personId: { userId: user.id, personId: person.id } },
      })
      return ok({
        percent: progress?.percent ?? 0,
        completedSections: done.map((d) => d.sectionId),
      })
    }

    const all = await prisma.userProgress.findMany({
      where: { userId: user.id },
      include: {
        person: {
          select: { slug: true, displayName: true, role: true, imageUrl: true, imageAlt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
    return ok(all)
  } catch (error) {
    return handleError('api.progress.get', error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const body = bodySchema.parse(await readJson(req))

    const person = await prisma.person.findFirst({
      where: { slug: body.personSlug, status: 'published' },
      select: { id: true },
    })
    if (!person) return handleError('api.progress.post', new Error('person_not_found'))

    // Раздел обязан принадлежать курсу этого человека.
    const section = await prisma.courseSection.findFirst({
      where: { id: body.sectionId, course: { personId: person.id } },
      select: { id: true },
    })
    if (!section) return handleError('api.progress.post', new Error('section_mismatch'))

    if (body.completed) {
      await prisma.userCompletedSection.upsert({
        where: { userId_sectionId: { userId: user.id, sectionId: section.id } },
        create: { userId: user.id, sectionId: section.id },
        update: {},
      })
      await recordEvent('section_complete', person.id, user.id)
    } else {
      await prisma.userCompletedSection.deleteMany({
        where: { userId: user.id, sectionId: section.id },
      })
    }

    const progress = await recalcProgress(user.id, person.id)
    return ok({ percent: progress?.percent ?? 0 })
  } catch (error) {
    return handleError('api.progress.post', error)
  }
}
