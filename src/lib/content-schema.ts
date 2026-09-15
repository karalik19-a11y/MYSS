import { z } from 'zod'

export const CONTENT_STATUS = ['draft', 'review', 'verified', 'published'] as const
export const CONFIDENCE = ['high', 'medium', 'low'] as const
export const SOURCE_TYPES = [
  'interview',
  'book',
  'official_site',
  'talk',
  'podcast',
  'documentary',
  'article',
  'archive',
  'academic',
  'public_profile',
  'other',
] as const
export const ERAS = ['ancient', 'medieval', 'early_modern', 'modern', 'contemporary'] as const
export const SECTION_KINDS = [
  'summary',
  'interesting',
  'how',
  'principles',
  'habits',
  'thinking',
  'cases',
  'mistakes',
  'quotes',
  'takeaways',
  'today',
] as const

/** Принципы, извлекаемые из привычек, — основа генератора «Мой день». */
export const PRINCIPLE_TAGS = [
  'early_start',
  'deep_work',
  'movement',
  'no_distraction',
  'planning',
  'reading',
  'reflection',
  'rest',
  'social',
  'craft',
] as const
export type PrincipleTag = (typeof PRINCIPLE_TAGS)[number]

const slug = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug: только строчные латинские буквы, цифры и дефис')

const sourceRef = z.string().min(1)

export const sourceSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(3),
  author: z.string().optional(),
  publisher: z.string().optional(),
  url: z.string().url().optional(),
  publishedAt: z.string().optional(),
  type: z.enum(SOURCE_TYPES),
  notes: z.string().optional(),
  reliability: z.enum(['high', 'medium', 'low']).default('medium'),
})

const base = {
  status: z.enum(CONTENT_STATUS).default('draft'),
  confidence: z.enum(CONFIDENCE).default('medium'),
  sources: z.array(sourceRef).default([]),
}

export const factSchema = z.object({
  text: z.string().min(10),
  context: z.string().optional(),
  ...base,
})

export const principleSchema = z.object({
  title: z.string().min(3).max(140),
  explanation: z.string().optional(),
  ...base,
})

export const habitSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  principleTag: z.enum(PRINCIPLE_TAGS).optional(),
  timeOfDay: z.enum(['morning', 'midday', 'evening', 'any']).default('any'),
  durationMin: z.number().int().positive().max(600).optional(),
  ...base,
})

export const quoteSchema = z.object({
  text: z.string().min(5),
  context: z.string().optional(),
  /** false — пересказ, выводится без кавычек (§8: не создавать псевдоцитаты). */
  isVerbatim: z.boolean().default(true),
  source: sourceRef.optional(),
  ...base,
})

export const caseSchema = z.object({
  title: z.string().min(3),
  situation: z.string().min(10),
  decision: z.string().min(10),
  result: z.string().min(5),
  lesson: z.string().min(5),
  year: z.number().int().optional(),
  ...base,
})

export const mistakeSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  consequence: z.string().optional(),
  lesson: z.string().optional(),
  ...base,
})

export const sectionSchema = z.object({
  kind: z.enum(SECTION_KINDS),
  title: z.string().min(2),
  subtitle: z.string().optional(),
  body: z.string().optional(),
})

export const personSchema = z
  .object({
    slug,
    name: z.string().min(2),
    displayName: z.string().min(2),
    role: z.string().min(2),
    descriptor: z.string().max(220).optional(),
    country: z.string().min(2),
    region: z.string().optional(),
    era: z.enum(ERAS).default('contemporary'),
    birthYear: z.number().int().optional(),
    deathYear: z.number().int().optional(),
    shortBio: z.string().max(400).optional(),
    status: z.enum(CONTENT_STATUS).default('draft'),
    confidence: z.enum(CONFIDENCE).default('medium'),
    categories: z.array(slug).min(1),
    image: z
      .object({
        url: z.string().url(),
        source: z.string().optional(),
        credit: z.string().optional(),
        alt: z.string().min(3),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      })
      .optional(),
    sources: z.array(sourceSchema).default([]),
    intro: z.string().optional(),
    sections: z.array(sectionSchema).default([]),
    facts: z.array(factSchema).default([]),
    principles: z.array(principleSchema).default([]),
    habits: z.array(habitSchema).default([]),
    quotes: z.array(quoteSchema).default([]),
    cases: z.array(caseSchema).default([]),
    mistakes: z.array(mistakeSchema).default([]),
    takeaways: z.array(z.string().min(5)).default([]),
    today: z.array(z.string().min(5)).default([]),
    related: z.array(slug).default([]),
  })
  .superRefine((person, ctx) => {
    const keys = new Set(person.sources.map((s) => s.key))
    const checkRefs = (refs: string[], path: string) => {
      for (const ref of refs) {
        if (!keys.has(ref)) {
          ctx.addIssue({
            code: 'custom',
            path: [path],
            message: `Ссылка на неизвестный источник: "${ref}"`,
          })
        }
      }
    }
    person.facts.forEach((f, i) => checkRefs(f.sources, `facts.${i}`))
    person.principles.forEach((p, i) => checkRefs(p.sources, `principles.${i}`))
    person.habits.forEach((h, i) => checkRefs(h.sources, `habits.${i}`))
    person.cases.forEach((c, i) => checkRefs(c.sources, `cases.${i}`))
    person.mistakes.forEach((m, i) => checkRefs(m.sources, `mistakes.${i}`))
    person.quotes.forEach((q, i) => {
      checkRefs(q.sources, `quotes.${i}`)
      if (q.source && !keys.has(q.source)) {
        ctx.addIssue({
          code: 'custom',
          path: [`quotes.${i}.source`],
          message: `Цитата ссылается на неизвестный источник: "${q.source}"`,
        })
      }
      // §8: у каждой цитаты должен быть источник.
      if (!q.source && q.sources.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: [`quotes.${i}`],
          message: 'У цитаты нет источника',
        })
      }
    })

    // §9: опубликованный материал обязан быть обеспечен источниками.
    if (person.status === 'published') {
      if (person.sources.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['sources'],
          message: 'Публикация без источников запрещена',
        })
      }
      if (!person.image) {
        ctx.addIssue({
          code: 'custom',
          path: ['image'],
          message: 'Публикация без изображения запрещена',
        })
      }
      const unsourced = person.facts.filter((f) => f.sources.length === 0).length
      if (unsourced > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['facts'],
          message: `Фактов без источника: ${unsourced}`,
        })
      }
    }

    if (person.birthYear && person.deathYear && person.deathYear < person.birthYear) {
      ctx.addIssue({
        code: 'custom',
        path: ['deathYear'],
        message: 'Год смерти раньше года рождения',
      })
    }
  })

export type PersonContent = z.infer<typeof personSchema>
export type SourceContent = z.infer<typeof sourceSchema>

export const categorySchema = z.object({
  slug,
  name: z.string().min(2),
  description: z.string().optional(),
  accent: z.string().optional(),
  sortOrder: z.number().int().default(0),
})

export type CategoryContent = z.infer<typeof categorySchema>
