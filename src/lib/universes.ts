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
  | 'godfather'
  | 'avatar'
  | 'incredibles'
  | 'batman'
  | 'spiderman'
  | 'pirates-of-the-caribbean'
  | 'hunger-games'
  | 'shrek'
  | 'cars'
  | 'john-wick'
  | 'godzilla'
  | 'planet-of-the-apes'
  | 'game-of-thrones'
  | 'breaking-bad'
  | 'indiana-jones'
  | 'rocky'
  | 'creed'
  | 'kung-fu-panda'
  | 'how-to-train-your-dragon'
  | 'ice-age'
  | 'despicable-me'
  | 'minions'
  | 'toy-story'
  | 'dune'
  | 'the-matrix'
  | 'twilight-saga'

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
  | 'godfather'
  | 'avatar'
  | 'pixar'
  | 'batman'
  | 'spiderman'
  | 'pirates'
  | 'hunger'
  | 'shrek'
  | 'cars'
  | 'johnwick'
  | 'godzilla'
  | 'apes'
  | 'got'
  | 'breakingbad'
  | 'indy'
  | 'rocky'
  | 'creed'
  | 'kungfu'
  | 'dragon'
  | 'iceage'
  | 'despicable'
  | 'minions'
  | 'toystory'
  | 'dune'
  | 'matrix'
  | 'twilight'

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
  {
    slug: 'godfather',
    name: 'The Godfather Trilogy',
    badge: 'GODFATHER',
    tagline: 'The epic tale of the Corleone family.',
    accent: 'godfather',
    mark: 'Godfather',
    sub: 'Crime Saga',
  },
  {
    slug: 'avatar',
    name: 'Avatar',
    badge: 'AVATAR',
    tagline: 'James Cameron’s visionary sci-fi epic across Pandora.',
    accent: 'avatar',
    mark: 'Avatar',
    sub: 'Pandora Saga',
  },
  {
    slug: 'incredibles',
    name: 'The Incredibles',
    badge: 'INCREDIBLES',
    tagline: 'Superheroes forced to live normal lives — until duty calls.',
    accent: 'pixar',
    mark: 'Incredibles',
    sub: 'Super Family',
  },
  {
    slug: 'batman',
    name: 'Batman Collection',
    badge: 'BATMAN',
    tagline: 'The Dark Knight’s complete cinematic journey through Gotham.',
    accent: 'batman',
    mark: 'Batman',
    sub: 'Gotham Saga',
  },
  {
    slug: 'spiderman',
    name: 'Spider-Man Collection',
    badge: 'SPIDER-MAN',
    tagline: 'Every web-slinger — Tobey, Andrew, Tom and the Spider-Verse.',
    accent: 'spiderman',
    mark: 'Spider-Man',
    sub: 'Web-Slinger Saga',
  },
  {
    slug: 'pirates-of-the-caribbean',
    name: 'Pirates of the Caribbean',
    badge: 'PIRATES',
    tagline: 'Yo ho ho — the complete high-seas adventure with Captain Jack Sparrow.',
    accent: 'pirates',
    mark: 'Pirates',
    sub: 'Caribbean Saga',
  },
  {
    slug: 'hunger-games',
    name: 'The Hunger Games',
    badge: 'HUNGER GAMES',
    tagline: 'The complete Panem saga — from the 74th Games to the Ballad.',
    accent: 'hunger',
    mark: 'Hunger',
    sub: 'Panem Saga',
  },
  {
    slug: 'shrek',
    name: 'Shrek Collection',
    badge: 'SHREK',
    tagline: 'The ogre, the donkey and every fairytale twist in the swamp.',
    accent: 'shrek',
    mark: 'Shrek',
    sub: 'Swamp Saga',
  },
  {
    slug: 'cars',
    name: 'Cars',
    badge: 'CARS',
    tagline: 'Lightning McQueen’s full road-trip through Radiator Springs and beyond.',
    accent: 'cars',
    mark: 'Cars',
    sub: 'Route 66',
  },
  {
    slug: 'john-wick',
    name: 'John Wick',
    badge: 'JOHN WICK',
    tagline: 'The Baba Yaga’s complete path of vengeance across the underworld.',
    accent: 'johnwick',
    mark: 'John Wick',
    sub: 'Continental Saga',
  },
  {
    slug: 'godzilla',
    name: 'Godzilla (MonsterVerse)',
    badge: 'GODZILLA',
    tagline: 'Titans clash — the MonsterVerse from Godzilla to Kong and beyond.',
    accent: 'godzilla',
    mark: 'Godzilla',
    sub: 'MonsterVerse',
  },
  {
    slug: 'planet-of-the-apes',
    name: 'Planet of the Apes (Reboot)',
    badge: 'APES',
    tagline: 'The rise of Caesar and the war for the planet of the apes.',
    accent: 'apes',
    mark: 'Apes',
    sub: 'Caesar Saga',
  },
  {
    slug: 'game-of-thrones',
    name: 'Game of Thrones Universe',
    badge: 'GOT',
    tagline: 'Winter is coming — Westeros, House of the Dragon and the Iron Throne.',
    accent: 'got',
    mark: 'GoT',
    sub: 'Westeros',
  },
  {
    slug: 'breaking-bad',
    name: 'Breaking Bad Universe',
    badge: 'BREAKING BAD',
    tagline: 'The complete empire of Walter White, Saul Goodman and El Camino.',
    accent: 'breakingbad',
    mark: 'Breaking Bad',
    sub: 'Empire',
  },
  {
    slug: 'indiana-jones',
    name: 'Indiana Jones',
    badge: 'INDY',
    tagline: 'The complete adventures of Dr. Henry Walton Jones, Jr.',
    accent: 'indy',
    mark: 'Indy',
    sub: 'Adventure',
  },
  {
    slug: 'rocky',
    name: 'Rocky Collection',
    badge: 'ROCKY',
    tagline: 'The Italian Stallion’s complete underdog saga.',
    accent: 'rocky',
    mark: 'Rocky',
    sub: 'Philadelphia',
  },
  {
    slug: 'creed',
    name: 'Creed Collection',
    badge: 'CREED',
    tagline: 'Adonis Creed carries the legacy of the Rocky saga into a new generation.',
    accent: 'creed',
    mark: 'Creed',
    sub: 'Legacy',
  },
  {
    slug: 'kung-fu-panda',
    name: 'Kung Fu Panda',
    badge: 'KUNG FU PANDA',
    tagline: 'The Dragon Warrior’s complete journey to inner peace and legend.',
    accent: 'kungfu',
    mark: 'Kung Fu',
    sub: 'Panda',
  },
  {
    slug: 'how-to-train-your-dragon',
    name: 'How to Train Your Dragon',
    badge: 'DRAGON',
    tagline: 'Hiccup and Toothless — the complete friendship that changed Berk.',
    accent: 'dragon',
    mark: 'Dragon',
    sub: 'Berk Saga',
  },
  {
    slug: 'ice-age',
    name: 'Ice Age',
    badge: 'ICE AGE',
    tagline: 'Manny, Sid, Diego and the herd’s complete prehistoric adventure.',
    accent: 'iceage',
    mark: 'Ice Age',
    sub: 'Herd Saga',
  },
  {
    slug: 'despicable-me',
    name: 'Despicable Me',
    badge: 'DESPICABLE ME',
    tagline: 'Gru, the girls and the Minions’ complete supervillain-to-hero journey.',
    accent: 'despicable',
    mark: 'Despicable',
    sub: 'Me',
  },
  {
    slug: 'minions',
    name: 'Minions',
    badge: 'MINIONS',
    tagline: 'The yellow chaos agents’ complete origin and rise of Gru stories.',
    accent: 'minions',
    mark: 'Minions',
    sub: 'Banana',
  },
  {
    slug: 'toy-story',
    name: 'Toy Story',
    badge: 'TOY STORY',
    tagline: 'Woody, Buzz and the toys’ complete journey from the attic to beyond.',
    accent: 'toystory',
    mark: 'Toy Story',
    sub: 'Toys',
  },
  {
    slug: 'dune',
    name: 'Dune',
    badge: 'DUNE',
    tagline: 'The complete spice saga of Arrakis — films and the Prophecy series.',
    accent: 'dune',
    mark: 'Dune',
    sub: 'Arrakis',
  },
  {
    slug: 'the-matrix',
    name: 'The Matrix',
    badge: 'MATRIX',
    tagline: 'Wake up, Neo — the complete red-pill journey through the Matrix.',
    accent: 'matrix',
    mark: 'Matrix',
    sub: 'Zion',
  },
  {
    slug: 'twilight-saga',
    name: 'The Twilight Saga',
    badge: 'TWILIGHT',
    tagline: 'The complete romance of Bella, Edward and the supernatural world of Forks.',
    accent: 'twilight',
    mark: 'Twilight',
    sub: 'Forks',
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
,
  godfather: '120 53 15',    // dark brown
  avatar: '6 182 212',       // cyan
  pixar: '249 115 22',       // orange
  batman: '30 41 59',        // dark slate
  spiderman: '220 38 38',    // red
  pirates: '161 98 7',       // amber
  hunger: '185 28 28',       // red
  shrek: '22 163 74',        // green
  cars: '234 179 8',         // yellow
  johnwick: '15 23 42',      // near black
  godzilla: '22 163 74',     // green
  apes: '120 53 15',         // brown
  got: '30 41 59',           // dark
  breakingbad: '34 197 94',  // green
  indy: '180 83 9',          // amber
  rocky: '220 38 38',        // red
  creed: '30 64 175',        // blue
  kungfu: '234 179 8',       // yellow
  dragon: '59 130 246',      // blue
  iceage: '6 182 212',       // cyan
  despicable: '234 179 8',   // yellow
  minions: '234 179 8',      // yellow
  toystory: '239 68 68',     // red
  dune: '180 83 9',          // sand
  matrix: '34 197 94',       // green
  twilight: '124 58 237',    // purple
}


/** Path helper */
export function universePath(slug: UniverseSlug) {
  return `/universes/${slug}`
}
