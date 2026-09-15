import { listPeople } from '@/server/queries'
import { DayPlanner } from '@/components/DayPlanner'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Мой день',
  description: 'Распорядок, собранный по принципам из подтверждённых привычек, а не копия чужого расписания.',
}

export default async function DayPage() {
  // В планировщик попадают только люди с подтверждёнными привычками.
  const people = await listPeople({ perPage: 50 })
  return <DayPlanner people={people.items} />
}
