import { listCategories } from '@/server/queries'
import { PeopleBrowser } from '@/components/PeopleBrowser'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Люди',
  description: 'Библиотека практического опыта: предприниматели, учёные, спортсмены, режиссёры.',
}

export default async function PeoplePage() {
  const categories = await listCategories()
  return <PeopleBrowser categories={categories.filter((c) => c.count > 0)} />
}
