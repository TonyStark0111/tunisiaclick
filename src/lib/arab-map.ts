// World cinema map geometry: 17 countries as tiles on a grid (rough geographic placement).
// Grid is always LTR. Pure helpers — safe on server and client.
import type { WorldCountryCode } from '@/src/lib/world-countries'

export const MAP_COLUMNS = 10
export const MAP_ROWS = 5

export type MapCell = { code: WorldCountryCode, x: number, y: number }

/**
 * Tiles in fixed display order (user-specified country list).
 * Positions are approximate world geography (west → east, north → south).
 */
export const MAP_CELLS: readonly MapCell[] = [
  // Americas
  { code: 'ca', x: 0, y: 0 },
  { code: 'us', x: 1, y: 0 },
  { code: 'mx', x: 1, y: 1 },
  { code: 'br', x: 2, y: 2 },
  // Europe
  { code: 'gb', x: 4, y: 0 },
  { code: 'dk', x: 5, y: 0 },
  { code: 'pl', x: 6, y: 0 },
  { code: 'fr', x: 4, y: 1 },
  { code: 'es', x: 3, y: 1 },
  // Asia
  { code: 'in', x: 7, y: 1 },
  { code: 'cn', x: 8, y: 1 },
  { code: 'kr', x: 9, y: 1 },
  { code: 'jp', x: 9, y: 0 },
  { code: 'th', x: 8, y: 2 },
  { code: 'ph', x: 9, y: 2 },
  { code: 'id', x: 8, y: 3 },
  // Oceania
  { code: 'nz', x: 9, y: 4 },
]

const BY_CODE = new Map(MAP_CELLS.map((cell) => [cell.code, cell]))

export function cellOf(code: WorldCountryCode): MapCell {
  return BY_CODE.get(code)!
}

/** Map accent colour (cool world-blue, rgb channels). */
export const MAP_ACCENT = '59 130 246'

/** Entrance ripple origin (United States — first in the list). */
export const MAP_ORIGIN: WorldCountryCode = 'us'

export function rippleDistance(code: WorldCountryCode): number {
  const from = cellOf(MAP_ORIGIN)
  const to = cellOf(code)
  return Math.hypot(to.x - from.x, to.y - from.y)
}

export const rippleDelay = (code: WorldCountryCode) => Math.round(40 * rippleDistance(code))

export function intensity(n: number | null | undefined): number {
  if (!n || n <= 0) return 0
  return Math.min(1, Math.log10(n + 1) / Math.log10(5000))
}

export const posterOpacity = (n: number | null | undefined) =>
  Math.round((0.14 + 0.26 * intensity(n)) * 1000) / 1000

export type Direction = 'left' | 'right' | 'up' | 'down'

export function step(from: WorldCountryCode, direction: Direction): WorldCountryCode | null {
  const origin = cellOf(from)
  const horizontal = direction === 'left' || direction === 'right'
  const sign = direction === 'right' || direction === 'down' ? 1 : -1
  let best: { code: WorldCountryCode, score: number, distance: number, across: number } | null = null
  for (const cell of MAP_CELLS) {
    const dx = cell.x - origin.x
    const dy = cell.y - origin.y
    const along = (horizontal ? dx : dy) * sign
    if (along <= 0) continue
    const across = horizontal ? dy : dx
    const score = along + 2 * Math.abs(across)
    const distance = Math.hypot(dx, dy)
    if (
      !best
      || score < best.score
      || (score === best.score && distance < best.distance)
      || (score === best.score && distance === best.distance && across > best.across)
    ) {
      best = { code: cell.code, score, distance, across }
    }
  }
  return best?.code ?? null
}

export const FIRST_TILE: WorldCountryCode = 'us'
export const LAST_TILE: WorldCountryCode = 'nz'

/** Rough cultural / geographic neighbours for the chip row on a country page. */
const NEIGHBOURS: Record<WorldCountryCode, readonly WorldCountryCode[]> = {
  us: ['ca', 'mx', 'gb'],
  ca: ['us', 'gb', 'fr'],
  mx: ['us', 'br', 'es'],
  br: ['mx', 'es', 'us'],
  gb: ['fr', 'us', 'ca', 'dk'],
  fr: ['gb', 'es', 'pl', 'dk'],
  es: ['fr', 'mx', 'br'],
  dk: ['gb', 'pl', 'fr'],
  pl: ['dk', 'fr', 'gb'],
  in: ['cn', 'th', 'id'],
  cn: ['jp', 'kr', 'in'],
  jp: ['kr', 'cn', 'ph'],
  kr: ['jp', 'cn', 'ph'],
  th: ['id', 'ph', 'in', 'cn'],
  ph: ['id', 'th', 'jp', 'kr'],
  id: ['th', 'ph', 'in', 'nz'],
  nz: ['id', 'ph', 'jp'],
}

export function neighbours(code: WorldCountryCode, limit = 4): WorldCountryCode[] {
  return (NEIGHBOURS[code] ?? []).slice(0, limit)
}

const ARTICLE = /^\s*ال(?=\S)/u
const MARKS = /\p{M}/gu

export function foldName(name: string): string {
  return name
    .replace(ARTICLE, '')
    .normalize('NFD')
    .replace(MARKS, '')
    .replace(/[ٱٲٳ]/g, 'ا')
    .replace(/ـ/g, '')
    .toLocaleLowerCase('en')
    .trim()
}

/** Keep fixed user order (WORLD_COUNTRY_CODES) — do NOT sort alphabetically. */
export function sortByName<T extends { code: string }>(items: readonly T[], _lang?: string): T[] {
  // Lazy import avoided: order matches MAP_CELLS codes via WORLD_COUNTRY_CODES in world-countries.
  // Import order list inline to avoid circular deps.
  const ORDER = ['us','in','cn','jp','kr','id','ph','th','gb','ca','mx','es','br','fr','pl','dk','nz'] as const
  const order = new Map(ORDER.map((c, i) => [c, i]))
  return [...items].sort((a, b) => (order.get(a.code as any) ?? 99) - (order.get(b.code as any) ?? 99))
}

export function typeahead(
  typed: string,
  entries: readonly { code: WorldCountryCode, names: readonly string[] }[],
  current?: WorldCountryCode | null,
): WorldCountryCode | null {
  const query = foldName(typed)
  if (!query) return null
  const cycling = [...query].every((char) => char === query[0])
  const needle = cycling ? query[0] : query
  const start = current ? Math.max(0, entries.findIndex((entry) => entry.code === current)) : 0
  const offset = cycling && current ? 1 : 0
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[(start + offset + i) % entries.length]
    if (entry.names.some((name) => foldName(name).startsWith(needle))) return entry.code
  }
  return null
}
