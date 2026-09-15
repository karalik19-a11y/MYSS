import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/server/auth'
import { fail, handleError, ok } from '@/server/http'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req)
    const { id } = await params
    // Удаляем только собственную запись пользователя.
    const result = await prisma.favorite.deleteMany({ where: { id, userId: user.id } })
    if (result.count === 0) return fail('Эта запись уже удалена.', 404, 'not_found')
    return ok({ deleted: true })
  } catch (error) {
    return handleError('api.favorites.delete', error)
  }
}
