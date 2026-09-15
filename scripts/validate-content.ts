/**
 * npm run validate-content
 *
 * Проверяет контент до попадания в базу:
 *  - дубликаты slug и имён;
 *  - корректность структуры (zod-схемы);
 *  - существование категорий;
 *  - наличие источников у фактов и цитат;
 *  - дублирующиеся цитаты;
 *  - согласованность master list и профилей;
 *  - корректность ссылок related.
 */
import fs from 'node:fs'
import path from 'node:path'
import { categorySchema, personSchema } from '../src/lib/content-schema'
import { readMasterList } from './lib/master-list'

const ROOT = path.resolve(process.cwd(), 'content')
const PEOPLE_DIR = path.join(ROOT, 'people')

const errors: string[] = []
const warnings: string[] = []

function err(where: string, message: string) {
  errors.push(`${where}: ${message}`)
}
function warn(where: string, message: string) {
  warnings.push(`${where}: ${message}`)
}

// ---------- Категории ----------
const rawCategories = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'categories.json'), 'utf8'),
) as unknown[]

const categorySlugs = new Set<string>()
for (const [i, raw] of rawCategories.entries()) {
  const parsed = categorySchema.safeParse(raw)
  if (!parsed.success) {
    err(`categories[${i}]`, parsed.error.issues.map((x) => x.message).join('; '))
    continue
  }
  if (categorySlugs.has(parsed.data.slug)) {
    err('categories', `дубликат slug "${parsed.data.slug}"`)
  }
  categorySlugs.add(parsed.data.slug)
}

// ---------- Master list ----------
const master = readMasterList()
const masterSlugs = new Set<string>()
const masterNames = new Map<string, string>()

for (const entry of master) {
  if (masterSlugs.has(entry.slug)) {
    err('master-list', `дубликат slug "${entry.slug}"`)
  }
  masterSlugs.add(entry.slug)

  const nameKey = entry.name.toLowerCase().trim()
  if (masterNames.has(nameKey)) {
    err('master-list', `дубликат имени "${entry.name}" (${entry.slug} и ${masterNames.get(nameKey)})`)
  }
  masterNames.set(nameKey, entry.slug)

  if (!entry.slug) err('master-list', `пустой slug у "${entry.name}"`)
  if (entry.categories.length === 0) {
    err('master-list', `у "${entry.slug}" нет категорий`)
  }
  for (const cat of entry.categories) {
    if (!categorySlugs.has(cat)) {
      err('master-list', `у "${entry.slug}" неизвестная категория "${cat}"`)
    }
  }
  if (entry.birthYear && entry.deathYear && entry.deathYear < entry.birthYear) {
    err('master-list', `у "${entry.slug}" год смерти раньше года рождения`)
  }
}

// ---------- Профили ----------
const personSlugs = new Set<string>()
const relatedRefs: Array<{ from: string; to: string }> = []
const quoteIndex = new Map<string, string>()
let published = 0

const files = fs.existsSync(PEOPLE_DIR)
  ? fs.readdirSync(PEOPLE_DIR).filter((f) => f.endsWith('.json'))
  : []

for (const file of files) {
  const where = `people/${file}`
  let raw: unknown
  try {
    raw = JSON.parse(fs.readFileSync(path.join(PEOPLE_DIR, file), 'utf8'))
  } catch (e) {
    err(where, `невалидный JSON: ${(e as Error).message}`)
    continue
  }

  const parsed = personSchema.safeParse(raw)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      err(where, `${issue.path.join('.') || '(корень)'} — ${issue.message}`)
    }
    continue
  }
  const person = parsed.data

  if (path.basename(file, '.json') !== person.slug) {
    err(where, `имя файла не совпадает со slug "${person.slug}"`)
  }
  if (personSlugs.has(person.slug)) {
    err(where, `дубликат профиля "${person.slug}"`)
  }
  personSlugs.add(person.slug)

  if (!masterSlugs.has(person.slug)) {
    warn(where, `профиля нет в master-list.tsv — добавь строку, чтобы список оставался единым источником`)
  }

  for (const cat of person.categories) {
    if (!categorySlugs.has(cat)) err(where, `неизвестная категория "${cat}"`)
  }

  for (const rel of person.related) {
    relatedRefs.push({ from: person.slug, to: rel })
  }

  for (const quote of person.quotes) {
    const key = quote.text.toLowerCase().replace(/\s+/g, ' ').trim()
    const existing = quoteIndex.get(key)
    if (existing) {
      err(where, `цитата дублирует уже имеющуюся в "${existing}"`)
    }
    quoteIndex.set(key, person.slug)
  }

  if (person.status === 'published') {
    published++
    if (person.facts.length === 0) err(where, 'публикация без фактов')
    if (person.principles.length === 0) err(where, 'публикация без принципов')
    if (person.takeaways.length < 5) {
      err(where, `в разделе «Что я бы забрал себе» должно быть 5–10 пунктов, сейчас ${person.takeaways.length}`)
    }
    if (person.takeaways.length > 10) {
      err(where, `в разделе «Что я бы забрал себе» больше 10 пунктов (${person.takeaways.length})`)
    }
    if (person.today.length === 0 || person.today.length > 5) {
      err(where, `в разделе «Попробуй сегодня» должно быть 1–5 действий, сейчас ${person.today.length}`)
    }
    if (person.mistakes.length === 0) {
      err(where, 'публикация без раздела «Ошибки» — продукт не должен превращаться в культ личности')
    }
    const lowConfidencePublished = [
      ...person.facts,
      ...person.principles,
      ...person.habits,
      ...person.cases,
      ...person.mistakes,
    ].filter((item) => item.confidence === 'low' && item.status === 'published')
    if (lowConfidencePublished.length > 0) {
      warn(where, `${lowConfidencePublished.length} опубликованных элементов с confidence=low — подаются как установленный факт`)
    }
  }
}

for (const ref of relatedRefs) {
  if (!masterSlugs.has(ref.to) && !personSlugs.has(ref.to)) {
    err(`people/${ref.from}.json`, `related ссылается на неизвестного человека "${ref.to}"`)
  }
  if (ref.to === ref.from) {
    err(`people/${ref.from}.json`, 'related ссылается сам на себя')
  }
}

// ---------- Отчёт ----------
console.log('')
console.log('  Проверка контента MYSS')
console.log('  ─────────────────────────────────────────')
console.log(`  Категорий:            ${categorySlugs.size}`)
console.log(`  В master list:        ${masterSlugs.size}`)
console.log(`  Профилей:             ${personSlugs.size}`)
console.log(`  Из них опубликовано:  ${published}`)
console.log('')

if (warnings.length) {
  console.log(`  Предупреждения (${warnings.length}):`)
  for (const w of warnings) console.log(`    - ${w}`)
  console.log('')
}

if (errors.length) {
  console.log(`  Ошибки (${errors.length}):`)
  for (const e of errors) console.log(`    - ${e}`)
  console.log('')
  process.exit(1)
}

console.log('  Ошибок нет.')
console.log('')
