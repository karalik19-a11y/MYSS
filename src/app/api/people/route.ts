import { NextRequest } from 'next/server'
import { listPeople } from '@/server/queries'
import { handleError, ok } from '@/server/http'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const result = await listPeople({
      category: sp.get('category') ?? undefined,
      country: sp.get('country') ?? undefined,
      era: sp.get('era') ?? undefined,
      q: sp.get('q') ?? undefined,
      sort: (sp.get('sort') as 'recommended' | 'popular' | 'new' | 'name') ?? 'recommended',
      page: sp.get('page') ? Number(sp.get('page')) : 1,
      perPage: sp.get('perPage') ? Number(sp.get('perPage')) : 20,
    })
    return ok(result)
  } catch (error) {
    return handleError('api.people', error)
  }
}
