import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/server/auth'
import { handleError, ok } from '@/server/http'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const routines = await prisma.dailyRoutine.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        person: { select: { slug: true, displayName: true, imageUrl: true, imageAlt: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    })
    return ok(routines)
  } catch (error) {
    return handleError('api.routine.get', error)
  }
}
