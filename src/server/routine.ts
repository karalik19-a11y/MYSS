import { z } from 'zod'
import type { Habit } from '@prisma/client'
import type { PrincipleTag } from '@/lib/content-schema'

/**
 * Генератор «Мой день».
 *
 * КРИТИЧЕСКОЕ ПРАВИЛО (§20): расписание человека НЕ копируется.
 * Из подтверждённых привычек извлекается принцип, и уже принцип
 * адаптируется под ограничения пользователя.
 */

/** ЧЧ:ММ в пределах суток. */
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export const routineInputSchema = z.object({
  personSlug: z.string().min(1),
  wakeTime: z.string().regex(TIME_RE, 'Формат времени: ЧЧ:ММ'),
  sleepTime: z.string().regex(TIME_RE, 'Формат времени: ЧЧ:ММ'),
  workStart: z.string().regex(TIME_RE, 'Формат времени: ЧЧ:ММ').optional(),
  workEnd: z.string().regex(TIME_RE, 'Формат времени: ЧЧ:ММ').optional(),
  commuteMin: z.number().int().min(0).max(300).default(0),
  mealsPerDay: z.number().int().min(1).max(6).default(3),
  trainingMin: z.number().int().min(0).max(300).default(0),
  studyMin: z.number().int().min(0).max(480).default(0),
  freeTimeMin: z.number().int().min(0).max(600).default(0),
  notes: z.string().max(500).optional(),
})

export type RoutineInput = z.infer<typeof routineInputSchema>

interface Block {
  startMin: number
  endMin: number
  title: string
  detail?: string
  ideaSource?: string
  whyThisPerson?: string
  howAdapted?: string
  habitId?: string
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const toTime = (m: number) => {
  const total = ((m % 1440) + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Человеческое описание принципа, извлечённого из привычки. */
const PRINCIPLE_MEANING: Record<PrincipleTag, { name: string; idea: string }> = {
  early_start: {
    name: 'Ранний старт',
    idea: 'Начинать день с собственной задачи, до того как его займут чужие запросы.',
  },
  deep_work: {
    name: 'Глубокая работа',
    idea: 'Один длинный непрерывный блок важнее нескольких коротких подходов.',
  },
  movement: {
    name: 'Движение',
    idea: 'Физическая активность как часть рабочего дня, а не остаток от него.',
  },
  no_distraction: {
    name: 'Отсутствие отвлечений',
    idea: 'Заранее убрать источники прерываний, а не бороться с ними по ходу.',
  },
  planning: {
    name: 'Планирование',
    idea: 'Короткий регулярный пересмотр приоритетов вместо длинных планов.',
  },
  reading: {
    name: 'Чтение и обучение',
    idea: 'Регулярное поступление нового материала небольшими порциями.',
  },
  reflection: {
    name: 'Фиксация и разбор',
    idea: 'Записывать результаты и решения, чтобы видеть их со стороны.',
  },
  rest: {
    name: 'Восстановление',
    idea: 'Отдых планируется наравне с работой, иначе его вытесняют.',
  },
  social: {
    name: 'Разговоры один на один',
    idea: 'Важное обсуждается в узком составе, а не на больших встречах.',
  },
  craft: {
    name: 'Работа руками над результатом',
    idea: 'Контакт с самим продуктом, а не только с описанием продукта.',
  },
}

export interface RoutinePlan {
  title: string
  items: Array<{
    startTime: string
    endTime: string
    title: string
    detail?: string
    ideaSource?: string
    whyThisPerson?: string
    howAdapted?: string
    habitId?: string
    sortOrder: number
  }>
  note: string
}

export function generateRoutine(
  input: RoutineInput,
  person: { displayName: string },
  habits: Habit[],
): RoutinePlan {
  const wake = toMin(input.wakeTime)
  let sleep = toMin(input.sleepTime)
  if (sleep <= wake) sleep += 1440 // сон после полуночи

  const blocks: Block[] = []
  const tags = new Set<PrincipleTag>(
    habits
      .map((h) => h.principleTag)
      .filter((t): t is PrincipleTag => Boolean(t && t in PRINCIPLE_MEANING)),
  )
  const habitByTag = new Map<PrincipleTag, Habit>()
  for (const h of habits) {
    if (h.principleTag && !habitByTag.has(h.principleTag as PrincipleTag)) {
      habitByTag.set(h.principleTag as PrincipleTag, h)
    }
  }

  const source = (tag: PrincipleTag) => {
    const habit = habitByTag.get(tag)
    const meaning = PRINCIPLE_MEANING[tag]
    return {
      habitId: habit?.id,
      ideaSource: meaning.idea,
      whyThisPerson: habit
        ? `У ${person.displayName} это проявлялось так: ${lowerFirst(habit.title)}.`
        : undefined,
    }
  }

  // Подъём
  blocks.push({
    startMin: wake,
    endMin: wake + 30,
    title: 'Подъём и начало дня',
    detail: 'Без почты и мессенджеров в первые полчаса.',
    ...(tags.has('no_distraction')
      ? {
          ...source('no_distraction'),
          howAdapted: 'Принцип «не начинать с чужой повестки» применён к твоему времени подъёма.',
        }
      : {}),
  })
  let cursor = wake + 30

  // Планирование
  if (tags.has('planning')) {
    const s = source('planning')
    blocks.push({
      startMin: cursor,
      endMin: cursor + 15,
      title: 'Пересмотр приоритетов',
      detail: 'Выбери одну задачу, которая важнее остальных на сегодня.',
      ...s,
      howAdapted: 'Сжато до 15 минут, чтобы поместиться в твой утренний интервал.',
    })
    cursor += 15
  }

  // Завтрак
  if (input.mealsPerDay >= 3) {
    blocks.push({ startMin: cursor, endMin: cursor + 30, title: 'Завтрак' })
    cursor += 30
  }

  const workStart = input.workStart ? toMin(input.workStart) : null
  const workEnd = input.workEnd ? toMin(input.workEnd) : null

  // Утренний блок глубокой работы — до начала обязательств
  if (tags.has('deep_work') || tags.has('early_start')) {
    const tag: PrincipleTag = tags.has('deep_work') ? 'deep_work' : 'early_start'
    const s = source(tag)
    const limit = workStart ? workStart - input.commuteMin : cursor + 90
    const available = Math.max(0, limit - cursor)
    const duration = Math.min(Math.max(available, 0), 90)
    if (duration >= 30) {
      blocks.push({
        startMin: cursor,
        endMin: cursor + duration,
        title: 'Своя главная задача',
        detail: 'Один непрерывный блок без переписки и встреч.',
        ...s,
        howAdapted: `Длительность подобрана под свободное окно до начала твоих обязательств — ${duration} минут, а не чужой распорядок.`,
      })
      cursor += duration
    }
  }

  // Дорога
  if (input.commuteMin > 0 && workStart) {
    const start = Math.max(cursor, workStart - input.commuteMin)
    blocks.push({
      startMin: start,
      endMin: start + input.commuteMin,
      title: 'Дорога',
      detail: tags.has('reading')
        ? 'Подходящее место для чтения или прослушивания материала.'
        : undefined,
      ...(tags.has('reading')
        ? {
            ...source('reading'),
            howAdapted: 'Принцип регулярного чтения помещён в уже существующий интервал дороги.',
          }
        : {}),
    })
    cursor = start + input.commuteMin
  }

  // Рабочий день
  if (workStart && workEnd) {
    const end = workEnd > workStart ? workEnd : workEnd + 1440
    const mid = Math.floor((workStart + end) / 2)

    blocks.push({
      startMin: Math.max(cursor, workStart),
      endMin: mid - 30,
      title: 'Работа',
      detail: tags.has('no_distraction')
        ? 'Первую половину держи уведомления выключенными.'
        : undefined,
      ...(tags.has('no_distraction') ? source('no_distraction') : {}),
      ...(tags.has('no_distraction')
        ? { howAdapted: 'Принцип применён к первой половине твоего рабочего дня.' }
        : {}),
    })

    blocks.push({ startMin: mid - 30, endMin: mid + 15, title: 'Обед' })

    // Разговор один на один или прогулка
    if (tags.has('social') || tags.has('movement')) {
      const tag: PrincipleTag = tags.has('social') ? 'social' : 'movement'
      const s = source(tag)
      blocks.push({
        startMin: mid + 15,
        endMin: mid + 45,
        title: tag === 'social' ? 'Разговор один на один' : 'Прогулка',
        detail:
          tag === 'social'
            ? 'Обсуди сложный вопрос вдвоём, желательно на ходу.'
            : 'Короткая прогулка, чтобы разгрузить внимание.',
        ...s,
        howAdapted: 'Встроено в середину дня, чтобы не отнимать время у твоей основной работы.',
      })
    }

    blocks.push({
      startMin: tags.has('social') || tags.has('movement') ? mid + 45 : mid + 15,
      endMin: end,
      title: 'Работа: вторая половина',
      detail: tags.has('craft') ? 'Хотя бы раз посмотри на сам результат, а не на отчёт о нём.' : undefined,
      ...(tags.has('craft') ? source('craft') : {}),
      ...(tags.has('craft')
        ? { howAdapted: 'Принцип работы с самим продуктом сведён к одной короткой проверке.' }
        : {}),
    })

    cursor = end + (input.commuteMin > 0 ? input.commuteMin : 0)
    if (input.commuteMin > 0) {
      blocks.push({ startMin: end, endMin: cursor, title: 'Дорога домой' })
    }
  }

  // Тренировка
  if (input.trainingMin > 0) {
    const s = tags.has('movement') ? source('movement') : {}
    blocks.push({
      startMin: cursor,
      endMin: cursor + input.trainingMin,
      title: 'Тренировка',
      ...s,
      ...(tags.has('movement')
        ? { howAdapted: 'Оставлено в том объёме, который ты указал, — принцип касается регулярности, а не длительности.' }
        : {}),
    })
    cursor += input.trainingMin
  }

  // Ужин
  if (input.mealsPerDay >= 2) {
    blocks.push({ startMin: cursor, endMin: cursor + 40, title: 'Ужин' })
    cursor += 40
  }

  // Учёба
  if (input.studyMin > 0) {
    const s = tags.has('reading') ? source('reading') : {}
    blocks.push({
      startMin: cursor,
      endMin: cursor + input.studyMin,
      title: 'Учёба',
      ...s,
      ...(tags.has('reading')
        ? { howAdapted: 'Разбито на твой указанный объём, без попытки повторить чужую норму.' }
        : {}),
    })
    cursor += input.studyMin
  }

  // Свободное время
  if (input.freeTimeMin > 0) {
    blocks.push({
      startMin: cursor,
      endMin: cursor + input.freeTimeMin,
      title: 'Свободное время',
      ...(tags.has('rest') ? source('rest') : {}),
      ...(tags.has('rest')
        ? { howAdapted: 'Зафиксировано в расписании, чтобы не вытеснялось работой.' }
        : {}),
    })
    cursor += input.freeTimeMin
  }

  // Вечерний разбор
  if (tags.has('reflection') && sleep - cursor >= 30) {
    const s = source('reflection')
    blocks.push({
      startMin: sleep - 45,
      endMin: sleep - 30,
      title: 'Короткий разбор дня',
      detail: 'Запиши, что получилось и что переносится на завтра.',
      ...s,
      howAdapted: 'Сокращено до 15 минут перед твоим временем сна.',
    })
  }

  blocks.push({
    startMin: sleep - 30,
    endMin: sleep,
    title: 'Подготовка ко сну',
    detail: 'Экран убираем заранее.',
  })

  // Чистка: убрать нулевые и пересекающиеся блоки
  const sorted = blocks
    .filter((b) => b.endMin > b.startMin)
    .sort((a, b) => a.startMin - b.startMin)

  const items = sorted.map((b, i) => ({
    startTime: toTime(b.startMin),
    endTime: toTime(b.endMin),
    title: b.title,
    detail: b.detail,
    ideaSource: b.ideaSource,
    whyThisPerson: b.whyThisPerson,
    howAdapted: b.howAdapted,
    habitId: b.habitId,
    sortOrder: i,
  }))

  return {
    title: `День по принципам: ${person.displayName}`,
    items,
    note:
      'Это не копия чужого расписания. Из подтверждённых привычек взяты принципы и разложены по твоим часам, работе и ограничениям.',
  }
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1)
}
