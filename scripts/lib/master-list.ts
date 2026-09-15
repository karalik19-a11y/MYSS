import fs from 'node:fs'
import path from 'node:path'
import { ERAS } from '../../src/lib/content-schema'

export interface MasterEntry {
  slug: string
  name: string
  role: string
  country: string
  region: string
  era: (typeof ERAS)[number]
  categories: string[]
  birthYear?: number
  deathYear?: number
}

const MASTER_PATH = path.resolve(process.cwd(), 'content', 'master-list.tsv')

export function readMasterList(filePath = MASTER_PATH): MasterEntry[] {
  const text = fs.readFileSync(filePath, 'utf8')
  const out: MasterEntry[] = []

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const cols = line.split('\t')
    const [slug, name, role, country, region, era, categories, birthYear, deathYear] = cols.map(
      (c) => (c ?? '').trim(),
    )

    out.push({
      slug,
      name,
      role,
      country,
      region,
      era: (ERAS as readonly string[]).includes(era)
        ? (era as MasterEntry['era'])
        : 'contemporary',
      categories: categories ? categories.split(',').map((c) => c.trim()).filter(Boolean) : [],
      birthYear: birthYear ? Number(birthYear) : undefined,
      deathYear: deathYear ? Number(deathYear) : undefined,
    })
  }

  return out
}
