import { NextRequest } from 'next/server'
import { randomPerson } from '@/server/queries'
import { fail, handleError, ok } from '@/server/http'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const exclude = req.nextUrl.searchParams.get('exclude') ?? undefined
    const person = await randomPerson(exclude)
    if (!person) return fail('Пока некого показать.', 404, 'empty')
    return ok(person)
  } catch (error) {
    return handleError('api.random', error)
  }
}
