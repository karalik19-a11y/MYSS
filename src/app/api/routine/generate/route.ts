import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/server/auth'
import { fail, handleError, ok, readJson } from '@/server/http'
import { generateRoutine, routineInputSchema } from '@/server/routine'
import { recordEvent } from '@/server/queries'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const input = routineInputSchema.parse(await readJson(req))

    const person = await prisma.person.findFirst({
      where: { slug: input.personSlug, status: 'published' },
      include: { habits: { where: { status: 'published' }, orderBy: { sortOrder: 'asc' } } },
    })
    if (!person) return fail('Такого человека нет в библиотеке.', 404, 'not_found')

    if (person.habits.length === 0) {
      // Не выдумываем распорядок, если подтверждённых привычек нет (§9, §20).
      return fail(
        'Для этого человека пока нет подтверждённых привычек, на основе которых можно собрать день.',
        422,
        'no_habits',
      )
    }

    const plan = generateRoutine(input, person, person.habits)

    const routine = await prisma.dailyRoutine.create({
      data: {
        userId: user.id,
        personId: person.id,
        title: plan.title,
        wakeTime: input.wakeTime,
        sleepTime: input.sleepTime,
        constraints: input,
        items: { create: plan.items },
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        person: { select: { slug: true, displayName: true, imageUrl: true, imageAlt: true } },
      },
    })

    await recordEvent('routine_generate', person.id, user.id)
    return ok({ routine, note: plan.note }, { status: 201 })
  } catch (error) {
    logger.error('routine.generation_failed', error)
    return handleError('api.routine.generate', error)
  }
}
