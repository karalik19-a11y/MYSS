import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { listPeople } from '@/server/queries'
import { fail, handleError, ok } from '@/server/http'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const category = await prisma.category.findUnique({ where: { slug } })
    if (!category) return fail('Такой категории нет.', 404, 'not_found')

    const page = req.nextUrl.searchParams.get('page')
    const people = await listPeople({ category: slug, page: page ? Number(page) : 1 })
    return ok({ category, ...people })
  } catch (error) {
    return handleError('api.category', error)
  }
}
