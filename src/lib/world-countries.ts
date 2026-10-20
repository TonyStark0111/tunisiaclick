// World cinema map countries (ISO 3166-1 alpha-2, lowercase as in our URLs).
// Order is fixed (not alphabetical) — the order the site displays them.

export type WorldCountryCode =
  | 'us' | 'in' | 'cn' | 'jp' | 'kr' | 'id' | 'ph' | 'th'
  | 'gb' | 'ca' | 'mx' | 'es' | 'br' | 'fr' | 'pl' | 'dk' | 'nz'

/** Fixed display / map order (user-specified, not alphabetical). */
export const WORLD_COUNTRY_CODES: readonly WorldCountryCode[] = [
  'us', // United States
  'in', // India
  'cn', // China
  'jp', // Japan
  'kr', // South Korea
  'id', // Indonesia
  'ph', // Philippines
  'th', // Thailand
  'gb', // United Kingdom
  'ca', // Canada
  'mx', // Mexico
  'es', // Spain
  'br', // Brazil
  'fr', // France
  'pl', // Poland
  'dk', // Denmark
  'nz', // New Zealand
]

/** Same countries as TMDB writes them (origin_country): uppercase. */
export const WORLD_TMDB_COUNTRIES: readonly string[] = WORLD_COUNTRY_CODES.map((c) => c.toUpperCase())

const CODES = new Set<string>(WORLD_COUNTRY_CODES)

export function isWorldCountry(v: string): v is WorldCountryCode {
  return CODES.has(v)
}

/** The first world-map country among a title's origin countries (TMDB uppercase), if any. */
export function worldCountryOf(o?: readonly string[] | null): WorldCountryCode | null {
  for (const code of o ?? []) {
    const lower = String(code).toLowerCase()
    if (isWorldCountry(lower)) return lower
  }
  return null
}

export function worldCountryHref(c: WorldCountryCode): string {
  return `/world-cinema/${c}`
}

const isArabicLanguage = (lang: string) => lang === 'tn' || lang.toLowerCase().startsWith('ar')

/** Country name in the viewer's language via Intl.DisplayNames. */
export function worldCountryName(c: WorldCountryCode, lang: string): string {
  const arabic = isArabicLanguage(lang)
  const tag = arabic ? 'ar' : lang || 'en'
  // South Korea: Intl often returns "South Korea" which is what we want
  try {
    return new Intl.DisplayNames([tag, 'en'], { type: 'region' }).of(c.toUpperCase()) ?? c.toUpperCase()
  } catch {
    return c.toUpperCase()
  }
}

// ── Compatibility aliases (old arab-cinema imports during transition) ────────
/** @deprecated use WorldCountryCode */
export type ArabCountryCode = WorldCountryCode
/** @deprecated use WORLD_COUNTRY_CODES */
export const ARAB_COUNTRY_CODES = WORLD_COUNTRY_CODES
/** @deprecated */
export const ARAB_TMDB_COUNTRIES = WORLD_TMDB_COUNTRIES
/** @deprecated */
export const isArabCountry = isWorldCountry
/** @deprecated */
export const arabCountryOf = worldCountryOf
/** @deprecated */
export const arabCountryHref = worldCountryHref
/** @deprecated */
export const arabCountryName = worldCountryName
