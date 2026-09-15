import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/server/auth'
import { handleError, ok } from '@/server/http'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const [progress, favorites, routines, interests] = await Promise.all([
      prisma.userProgress.findMany({
        where: { userId: user.id },
        include: { person: { select: { slug: true, displayName: true, role: true, imageUrl: true, imageAlt: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      prisma.favorite.count({ where: { userId: user.id } }),
      prisma.dailyRoutine.count({ where: { userId: user.id } }),
      prisma.userInterest.findMany({
        where: { userId: user.id },
        include: { category: { select: { slug: true, name: true } } },
        orderBy: { weight: 'desc' },
        take: 6,
      }),
    ])

    const completed = progress.filter((p) => p.percent === 100).length
    const overall =
      progress.length > 0
        ? Math.round(progress.reduce((s, p) => s + p.percent, 0) / progress.length)
        : 0

    return ok({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        photoUrl: user.photoUrl,
        isAdmin: user.isAdmin,
      },
      stats: { studied: progress.length, completed, overall, favorites, routines },
      progress,
      interests: interests.map((i) => i.category),
    })
  } catch (error) {
    return handleError('api.me', error)
  }
}
