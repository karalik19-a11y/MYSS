import { describe, expect, it } from 'vitest'
import type { Habit } from '@prisma/client'
import { generateRoutine, routineInputSchema } from '../src/server/routine'

function habit(partial: Partial<Habit>): Habit {
  return {
    id: 'h1',
    personId: 'p1',
    title: 'Ранний подъём в 05:00',
    description: null,
    principleTag: 'early_start',
    timeOfDay: 'morning',
    durationMin: 60,
    sortOrder: 0,
    status: 'published',
    confidence: 'high',
    claimId: null,
    ...partial,
  } as Habit
}

const person = { displayName: 'Тестовый человек' }

const baseInput = routineInputSchema.parse({
  personSlug: 'test',
  wakeTime: '08:00',
  sleepTime: '23:00',
  workStart: '10:00',
  workEnd: '18:00',
  commuteMin: 30,
  mealsPerDay: 3,
  trainingMin: 45,
  studyMin: 30,
  freeTimeMin: 60,
})

describe('generateRoutine', () => {
  it('строит день внутри границ пользователя, а не по чужому расписанию', () => {
    const plan = generateRoutine(baseInput, person, [habit({})])

    expect(plan.items.length).toBeGreaterThan(0)
    // День начинается во время подъёма пользователя (08:00), а не в 05:00 из привычки.
    expect(plan.items[0].startTime).toBe('08:00')
    const startsAtFive = plan.items.some((i) => i.startTime === '05:00')
    expect(startsAtFive).toBe(false)
  })

  it('уважает время отхода ко сну', () => {
    const plan = generateRoutine(baseInput, person, [habit({})])
    const last = plan.items[plan.items.length - 1]
    expect(last.endTime).toBe('23:00')
  })

  it('объясняет происхождение каждого заимствованного блока', () => {
    const plan = generateRoutine(baseInput, person, [
      habit({ id: 'h2', principleTag: 'deep_work', title: 'Длинные блоки сосредоточенной работы' }),
    ])
    const derived = plan.items.filter((i) => i.ideaSource)
    expect(derived.length).toBeGreaterThan(0)
    for (const item of derived) {
      expect(item.ideaSource).toBeTruthy()
      expect(item.howAdapted).toBeTruthy()
    }
  })

  it('связывает блок с конкретной привычкой человека', () => {
    const plan = generateRoutine(baseInput, person, [
      habit({ id: 'h3', principleTag: 'planning', title: 'Пересмотр списка приоритетов' }),
    ])
    const planning = plan.items.find((i) => i.habitId === 'h3')
    expect(planning).toBeDefined()
    expect(planning?.whyThisPerson).toContain('Тестовый человек')
  })

  it('работает со сном после полуночи', () => {
    const input = routineInputSchema.parse({
      personSlug: 'test',
      wakeTime: '09:00',
      sleepTime: '01:30',
      mealsPerDay: 3,
    })
    const plan = generateRoutine(input, person, [habit({})])
    expect(plan.items[plan.items.length - 1].endTime).toBe('01:30')
  })

  it('не создаёт блоков нулевой длины', () => {
    const plan = generateRoutine(baseInput, person, [habit({})])
    for (const item of plan.items) {
      expect(item.startTime).not.toBe(item.endTime)
    }
  })

  it('прямо сообщает, что это не копия чужого дня', () => {
    const plan = generateRoutine(baseInput, person, [habit({})])
    expect(plan.note).toContain('не копия')
  })

  it('отклоняет некорректный формат времени', () => {
    expect(() =>
      routineInputSchema.parse({ personSlug: 'x', wakeTime: '25:00', sleepTime: '23:00' }),
    ).toThrow()
  })
})
