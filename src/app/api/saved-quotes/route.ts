import { NextRequest } from 'next/server'
import { POST as createFavorite, GET as listFavorites } from '../favorites/route'

export const dynamic = 'force-dynamic'

/** Псевдоним /favorites с kind=quote. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const proxied = new Request(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({ kind: 'quote', targetId: body?.quoteId ?? body?.targetId }),
  })
  return createFavorite(proxied as NextRequest)
}

export async function GET(req: NextRequest) {
  return listFavorites(req)
}
