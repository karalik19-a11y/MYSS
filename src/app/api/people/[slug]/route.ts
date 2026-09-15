import { NextRequest } from 'next/server'
import { getPersonBySlug, getRecommendations, recordEvent } from '@/server/queries'
import { optionalUser } from '@/server/auth'
import { fail, handleError, ok } from '@/server/http'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const person = await getPersonBySlug(slug)
    if (!person) return fail('Такой страницы нет.', 404, 'not_found')

    const user = await optionalUser(req)
    await recordEvent('person_view', person.id, user?.id)

    const related = await getRecommendations(person.id)
    return ok({ person, related })
  } catch (error) {
    return handleError('api.person', error)
  }
}
