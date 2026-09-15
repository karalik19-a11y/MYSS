import { NextRequest } from 'next/server'
import { listPeople } from '@/server/queries'
import { handleError, ok } from '@/server/http'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
    if (q.length < 2) return ok({ items: [], total: 0, page: 1, perPage: 20 })
    return ok(await listPeople({ q, perPage: 20 }))
  } catch (error) {
    return handleError('api.search', error)
  }
}
