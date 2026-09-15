import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPersonBySlug, getRecommendations, recordEvent } from '@/server/queries'
import { PersonView } from '@/components/PersonView'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const person = await getPersonBySlug(slug)
  if (!person) return { title: 'Страница не найдена' }

  const description =
    person.descriptor ?? person.shortBio ?? `${person.displayName} — ${person.role}. Как он работал и что из этого можно забрать себе.`

  return {
    title: `${person.displayName} — ${person.role}`,
    description,
    alternates: { canonical: `/people/${person.slug}` },
    openGraph: {
      title: `${person.displayName} — ${person.role}`,
      description,
      images: person.imageUrl ? [{ url: person.imageUrl }] : undefined,
      type: 'profile',
    },
  }
}

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const person = await getPersonBySlug(slug)
  if (!person) notFound()

  const related = await getRecommendations(person.id)
  await recordEvent('person_view', person.id)

  return <PersonView person={person} related={related} />
}
