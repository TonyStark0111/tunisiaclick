/**
 * Cinematic Universes — exact port of Moviezonne’s curated franchise system.
 *
 * Data sources:
 * - Presentation (name, badge, tagline, accent): matches Moviezonne’s UNIVERSES array
 * - Ordered titles: src/data/collections-catalog.json (same file as Moviezonne)
 *
 * The rail and detail pages both read from here so they cannot drift.
 */

import catalog from '@/src/data/collections-catalog.json'

export type UniverseSlug =
  | 'mcu'
  | 'dceu'
  | 'x-men'
  | 'yrf-spy'
  | 'jurassic-park'
  | 'cop-universe'
  | 'star-wars'
  | 'transformers'
  | 'conjuring'
  | 'fast-furious'
  | 'james-bond'
  | 'terminator'
  | 'wizarding-world'
  | 'middle-earth'
  | 'mission-impossible'
  | 'predator'
  | 'maddock'

export type UniverseAccent =
  | 'marvel'
  | 'dc'
  | 'xmen'
  | 'yrfspy'
  | 'jurassic'
  | 'cop'
  | 'starwars'
  | 'transformers'
  | 'horror'
  | 'fast'
  | 'bond'
  | 'terminator'
  | 'wizard'
  | 'lotr'
  | 'mi'
  | 'predator'
  | 'maddock'

export interface UniverseMeta {
  slug: UniverseSlug
  name: string
  badge: string
  tagline: string
  accent: UniverseAccent
  /** Short label used in lockups on the rail */
  mark: string
  sub: string
}

/** Exact same presentation records as Moviezonne moviezone.js UNIVERSES + rail LOCKUPS */
export const UNIVERSES: UniverseMeta[] = [
  {
    slug: 'mcu',
    name: 'Marvel Cinematic Universe',
    badge: 'MARVEL',
    tagline: 'The complete MCU timeline — every film and narrative series.',
    accent: 'marvel',
    mark: 'MARVEL',
    sub: 'Cinematic Universe',
  },
  {
    slug: 'dceu',
    name: 'DC Universe',
    badge: 'DC',
    tagline: 'The DCEU legacy and DC Studios’ interconnected new era.',
    accent: 'dc',
    mark: 'DC',
    sub: 'Universe',
  },
  {
    slug: 'x-men',
    name: 'X-Men Cinematic Universe',
    badge: 'X-MEN',
    tagline: 'Every mutant film — the X-Men saga, Wolverine and Deadpool.',
    accent: 'xmen',
    mark: 'X-Men',
    sub: 'Mutant Saga',
  },
  {
    slug: 'yrf-spy',
    name: 'YRF Spy Universe',
    badge: 'YRF SPY',
    tagline: 'Tiger, Pathaan and Kabir — India’s biggest spy crossover.',
    accent: 'yrfspy',
    mark: 'YRF Spy',
    sub: 'Spy Universe',
  },
  {
    slug: 'jurassic-park',
    name: 'Jurassic World',
    badge: 'JURASSIC',
    tagline: 'Every Jurassic Park and World film, plus the animated canon.',
    accent: 'jurassic',
    mark: 'Jurassic',
    sub: 'Park & World',
  },
  {
    slug: 'cop-universe',
    name: 'Cop Universe',
    badge: 'COP UNIVERSE',
    tagline: 'Rohit Shetty’s force — Singham, Simmba and Sooryavanshi.',
    accent: 'cop',
    mark: 'Singham',
    sub: 'Cop Universe',
  },
  {
    slug: 'star-wars',
    name: 'Star Wars Cinematic Universe',
    badge: 'STAR WARS',
    tagline: 'The Skywalker saga, the standalone Stories and the Ewok adventures.',
    accent: 'starwars',
    mark: 'Star Wars',
    sub: 'Skywalker Saga',
  },
  {
    slug: 'transformers',
    name: 'Transformers',
    badge: 'TRANSFORMERS',
    tagline: 'Robots in disguise — films and animated sagas across generations.',
    accent: 'transformers',
    mark: 'Transformers',
    sub: 'Cybertron Saga',
  },
  {
    slug: 'conjuring',
    name: 'The Conjuring Universe',
    badge: 'CONJURING',
    tagline: 'Conjuring, Annabelle, The Nun and every connected nightmare.',
    accent: 'horror',
    mark: 'Conjuring',
    sub: 'Horror Universe',
  },
  {
    slug: 'fast-furious',
    name: 'Fast & Furious',
    badge: 'FAST',
    tagline: 'Every high-octane heist, race and family mission.',
    accent: 'fast',
    mark: 'Fast',
    sub: '& Furious',
  },
  {
    slug: 'james-bond',
    name: 'James Bond 007',
    badge: '007',
    tagline: 'The complete EON 007 film canon — six decades of espionage.',
    accent: 'bond',
    mark: '007',
    sub: 'James Bond',
  },
  {
    slug: 'terminator',
    name: 'Terminator',
    badge: 'TERMINATOR',
    tagline: 'The complete war between humanity and the machines.',
    accent: 'terminator',
    mark: 'Terminator',
    sub: 'Judgment Day',
  },
  {
    slug: 'wizarding-world',
    name: 'Wizarding World',
    badge: 'WIZARDING WORLD',
    tagline: 'Harry Potter and Fantastic Beasts — the complete magical journey.',
    accent: 'wizard',
    mark: 'Wizarding',
    sub: 'World of Magic',
  },
  {
    slug: 'middle-earth',
    name: 'Middle-earth',
    badge: 'MIDDLE-EARTH',
    tagline: 'The Lord of the Rings, The Hobbit and the ages of Middle-earth.',
    accent: 'lotr',
    mark: 'Middle-earth',
    sub: 'Rings & Hobbit',
  },
  {
    slug: 'mission-impossible',
    name: 'Mission: Impossible',
    badge: 'M:I',
    tagline: 'The original IMF series and every impossible cinematic mission.',
    accent: 'mi',
    mark: 'Mission',
    sub: 'Impossible',
  },
  {
    slug: 'predator',
    name: 'Predator',
    badge: 'PREDATOR',
    tagline: 'The ultimate hunters — Predator, Prey and the AVP encounters.',
    accent: 'predator',
    mark: 'Predator',
    sub: 'The Hunt',
  },
  {
    slug: 'maddock',
    name: 'Maddock Supernatural Universe',
    badge: 'MADDOCK',
    tagline: 'Stree, Bhediya, Munjya and every Chanderi horror-comedy legend.',
    accent: 'maddock',
    mark: 'Stree',
    sub: 'Maddock Horror',
  },
]

export const universeCount = UNIVERSES.length

export function getUniverse(slug: string): UniverseMeta | undefined {
  return UNIVERSES.find((u) => u.slug === slug)
}

export function isUniverseSlug(slug: string): slug is UniverseSlug {
  return UNIVERSES.some((u) => u.slug === slug)
}

export type CatalogTitle = {
  id: number
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
}

export type UniverseCatalog = {
  movies: CatalogTitle[]
  tv: CatalogTitle[]
}

/** Returns the ordered titles for a universe (exact data from collections-catalog.json) */
export function getUniverseCatalog(slug: UniverseSlug): UniverseCatalog {
  const raw = (catalog as any).universes?.[slug]
  if (!raw) return { movies: [], tv: [] }
  return {
    movies: Array.isArray(raw.movies) ? raw.movies : [],
    tv: Array.isArray(raw.tv) ? raw.tv : [],
  }
}

/** All titles sorted by release / first-air date (release order) */
export function getUniverseTimeline(slug: UniverseSlug): Array<CatalogTitle & { media_type: 'movie' | 'tv' }> {
  const { movies, tv } = getUniverseCatalog(slug)
  const items = [
    ...movies.map((m) => ({ ...m, media_type: 'movie' as const })),
    ...tv.map((t) => ({ ...t, media_type: 'tv' as const })),
  ]
  return items.sort((a, b) => {
    const da = a.release_date || a.first_air_date || '9999'
    const db = b.release_date || b.first_air_date || '9999'
    return da.localeCompare(db)
  })
}

/** Accent CSS variables / Tailwind-friendly colours (ported from universes.css) */
export const ACCENT_COLORS: Record<UniverseAccent, string> = {
  marvel: '229 62 62',       // #e53e3e
  dc: '37 99 235',           // #2563eb
  xmen: '234 179 8',         // #eab308
  yrfspy: '220 38 38',       // #dc2626
  jurassic: '34 197 94',     // #22c55e
  cop: '245 158 11',         // #f59e0b
  starwars: '234 179 8',     // #eab308
  transformers: '59 130 246',// #3b82f6
  horror: '127 29 29',       // #7f1d1d
  fast: '239 68 68',         // #ef4444
  bond: '161 98 7',          // #a16207
  terminator: '75 85 99',    // #4b5563
  wizard: '124 58 237',      // #7c3aed
  lotr: '180 83 9',          // #b45309
  mi: '14 165 233',          // #0ea5e9
  predator: '22 163 74',     // #16a34a
  maddock: '168 85 247',     // #a855f7
}

/** Path helper */
export function universePath(slug: UniverseSlug) {
  return `/universes/${slug}`
}
