export const SECTION_TITLES: Record<string, string> = {
  summary: 'Если коротко',
  interesting: 'Вот что интересно',
  how: 'Как он это делал',
  principles: 'Правила',
  habits: 'Привычки',
  thinking: 'Мышление',
  cases: 'Кейсы',
  mistakes: 'Ошибки',
  quotes: 'Цитаты',
  takeaways: 'Что я бы забрал себе',
  today: 'Попробуй сегодня',
}

export const SECTION_ORDER = [
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

export const ERA_LABELS: Record<string, string> = {
  ancient: 'Древний мир',
  medieval: 'Средние века',
  early_modern: 'Новое время',
  modern: 'XIX — начало XX века',
  contemporary: 'XX–XXI века',
}

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  interview: 'Интервью',
  book: 'Книга',
  official_site: 'Официальный источник',
  talk: 'Выступление',
  podcast: 'Подкаст',
  documentary: 'Документальный фильм',
  article: 'Статья',
  archive: 'Архив',
  academic: 'Академическая публикация',
  public_profile: 'Публичный профиль',
  other: 'Источник',
}

export const CONFIDENCE_LABELS: Record<string, string> = {
  high: 'Подтверждено',
  medium: 'Достоверно',
  low: 'Требует уточнения',
}

/** Строка для быстрого поиска: имя, роль, страна, категории и ключевые темы. */
export function buildSearchText(input: {
  name: string
  displayName?: string
  role: string
  country: string
  region?: string
  descriptor?: string
  shortBio?: string
  categories?: string[]
  extra?: string[]
}): string {
  return [
    input.name,
    input.displayName,
    input.role,
    input.country,
    input.region,
    input.descriptor,
    input.shortBio,
    ...(input.categories ?? []),
    ...(input.extra ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function lifespan(birthYear?: number | null, deathYear?: number | null): string | null {
  const fmt = (y: number) => (y < 0 ? `${Math.abs(y)} до н. э.` : String(y))
  if (birthYear && deathYear) return `${fmt(birthYear)} — ${fmt(deathYear)}`
  if (birthYear) return `род. ${fmt(birthYear)}`
  return null
}

/** Разбор списков вида "- пункт" в маркированный массив. */
export function parseList(body?: string | null): string[] {
  if (!body) return []
  return body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2).trim())
}
