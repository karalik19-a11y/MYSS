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

/**
 * Вики-хранилище отдаёт по прямой ссылке оригинал файла — иногда несколько
 * мегабайт. Для карточек и обложек этого не нужно: превью нужной ширины
 * весит на порядок меньше и отдаётся с того же CDN.
 *
 * Оригинал:  /wikipedia/commons/0/0d/Имя.jpg
 * Превью:    /wikipedia/commons/thumb/0/0d/Имя.jpg/640px-Имя.jpg
 */
export function wikiThumb(url: string | null | undefined, width: number): string | null {
  if (!url) return null
  if (!url.includes('/wikipedia/commons/')) return url
  // Уже превью — подменяем только ширину.
  if (url.includes('/commons/thumb/')) {
    return url.replace(/\/\d+px-/, `/${width}px-`)
  }
  const marker = '/wikipedia/commons/'
  const tail = url.slice(url.indexOf(marker) + marker.length)
  const parts = tail.split('/')
  // Ожидается вид a/bc/Имя.ext — иначе формат незнакомый, не трогаем.
  if (parts.length !== 3) return url
  const file = parts[2]
  // SVG превью отдаются как png, а для фотографий формат сохраняется.
  return `${url.slice(0, url.indexOf(marker))}${marker}thumb/${tail}/${width}px-${file}`
}
