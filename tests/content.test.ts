import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { categorySchema, personSchema } from '../src/lib/content-schema'
import { buildSearchText, lifespan, parseList } from '../src/lib/content-utils'
import { readMasterList } from '../scripts/lib/master-list'

const ROOT = path.resolve(process.cwd(), 'content')

describe('контент библиотеки', () => {
  it('все категории валидны и уникальны', () => {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'categories.json'), 'utf8'))
    const slugs = new Set<string>()
    for (const item of raw) {
      const parsed = categorySchema.parse(item)
      expect(slugs.has(parsed.slug)).toBe(false)
      slugs.add(parsed.slug)
    }
    expect(slugs.size).toBeGreaterThanOrEqual(18)
  })

  it('master list содержит не менее 500 человек без дубликатов', () => {
    const entries = readMasterList()
    expect(entries.length).toBeGreaterThanOrEqual(500)

    const slugs = new Set(entries.map((e) => e.slug))
    expect(slugs.size).toBe(entries.length)
  })

  it('в master list есть люди ранних эпох и широкая география', () => {
    const entries = readMasterList()
    const early = entries.filter((e) =>
      ['ancient', 'medieval', 'early_modern'].includes(e.era),
    )
    expect(early.length).toBeGreaterThanOrEqual(50)

    const countries = new Set(entries.map((e) => e.country))
    expect(countries.size).toBeGreaterThanOrEqual(25)
  })

  it('все профили проходят проверку схемы', () => {
    const dir = path.join(ROOT, 'people')
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
    expect(files.length).toBeGreaterThan(0)

    for (const file of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
      const parsed = personSchema.safeParse(raw)
      if (!parsed.success) {
        throw new Error(
          `${file}: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
        )
      }
      expect(path.basename(file, '.json')).toBe(parsed.data.slug)
    }
  })

  it('у каждой опубликованной цитаты есть источник', () => {
    const dir = path.join(ROOT, 'people')
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const person = personSchema.parse(
        JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')),
      )
      for (const quote of person.quotes) {
        expect(Boolean(quote.source) || quote.sources.length > 0).toBe(true)
      }
    }
  })

  it('опубликованные профили содержат раздел об ошибках', () => {
    const dir = path.join(ROOT, 'people')
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const person = personSchema.parse(
        JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')),
      )
      if (person.status === 'published') {
        expect(person.mistakes.length).toBeGreaterThan(0)
        expect(person.takeaways.length).toBeGreaterThanOrEqual(5)
        expect(person.sources.length).toBeGreaterThan(0)
        expect(person.image).toBeDefined()
      }
    }
  })

  it('схема запрещает публикацию без источников', () => {
    const invalid = {
      slug: 'test-person',
      name: 'Тест',
      displayName: 'Тест',
      role: 'Роль',
      country: 'Страна',
      status: 'published',
      categories: ['business'],
      image: { url: 'https://example.com/a.jpg', alt: 'альт' },
      sources: [],
      facts: [],
    }
    expect(personSchema.safeParse(invalid).success).toBe(false)
  })

  it('схема ловит ссылку на несуществующий источник', () => {
    const invalid = {
      slug: 'test-person',
      name: 'Тест',
      displayName: 'Тест',
      role: 'Роль',
      country: 'Страна',
      categories: ['business'],
      sources: [{ key: 'a', title: 'Источник', type: 'book' }],
      facts: [{ text: 'Достаточно длинный факт для проверки.', sources: ['b'] }],
    }
    expect(personSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('вспомогательные функции', () => {
  it('формирует строку поиска в нижнем регистре', () => {
    const text = buildSearchText({
      name: 'Стив Джобс',
      role: 'Сооснователь Apple',
      country: 'США',
      categories: ['technology'],
    })
    expect(text).toContain('стив джобс')
    expect(text).toContain('сша')
  })

  it('форматирует годы жизни, включая до нашей эры', () => {
    expect(lifespan(1955, 2011)).toBe('1955 — 2011')
    expect(lifespan(1930, null)).toBe('род. 1930')
    expect(lifespan(-470, -399)).toBe('470 до н. э. — 399 до н. э.')
    expect(lifespan(null, null)).toBeNull()
  })

  it('разбирает маркированные списки', () => {
    expect(parseList('- первый\n- второй\nне пункт')).toEqual(['первый', 'второй'])
    expect(parseList(null)).toEqual([])
  })
})
