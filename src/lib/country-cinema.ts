// One country's films and series on TMDB (origin country), for the Arab cinema map: the requests,
// the film of the day, and the people born there. Server only (TMDB key). Every request is cached
// by Next's data cache for a day (people for a week), and the map and a country's page share the
// same three base requests (popular films, popular series, best-known films), so opening a country
// after the map costs a handful of new calls.
import { tmdbFetchSafe } from '@/src/lib/tmdb'
import { filterKidSafe, kidsDiscoverParams } from '@/src/lib/kids'
import { hash } from '@/src/lib/seed'
import type { ArabCountryCode } from '@/src/lib/arab-countries'

const DAY = 86400
const WEEK = 7 * DAY

export type Kind = 'movie' | 'tv'
type Params = Record<string, string | number | boolean | undefined>
export type DiscoverPage = { results: any[], total_results: number, total_pages: number }

/** A title as the map and the panels need it (light enough to send to the browser). */
export type MapTitle = {
  id: number
  kind: Kind
  title: string
  poster: string | null
  backdrop: string | null
  year: string | null
}

export const titleOf = (item: any): string => item.title || item.name || item.original_title || item.original_name || ''
const yearOf = (item: any): string | null => (item.release_date || item.first_air_date || '').slice(0, 4) || null

export function toMapTitle(item: any, kind: Kind): MapTitle {
  return { id: item.id, kind, title: titleOf(item), poster: item.poster_path ?? null, backdrop: item.backdrop_path ?? null, year: yearOf(item) }
}

/** With `media_type`, so cards and filterKidSafe know what each item is. */
const tagged = (page: DiscoverPage | null, kind: Kind) => (page?.results ?? []).map((item) => ({ ...item, media_type: kind }))

/**
 * Titles TMDB files under the wrong country: Cambodian films in Khmer ('km') land under Comoros
 * (KM). Their original language gives them away.
 */
const MISLABELLED: Partial<Record<ArabCountryCode, readonly string[]>> = {}

/**
 * A page without the mislabelled titles, and a count to match: exact on a single page, otherwise
 * scaled by the share of the first page that was kept.
 */
export function withoutMislabelled(code: ArabCountryCode, page: DiscoverPage | null): DiscoverPage | null {
  const languages = MISLABELLED[code]
  if (!page || !languages) return page
  const all = page.results ?? []
  const results = all.filter((item) => !languages.includes(item.original_language))
  if (results.length === all.length) return page
  const total = (page.total_pages ?? 1) <= 1 ? results.length : Math.round((page.total_results ?? 0) * results.length / Math.max(1, all.length))
  return { ...page, results, total_results: total }
}

/**
 * One discover request for a country. Kids: TMDB's Kids filters (US-certified family titles), and
 * filterKidSafe on top, title by title (see lib/kids). Null when TMDB didn't answer.
 */
export async function countryDiscover(code: ArabCountryCode, kind: Kind, params: Params, language: string, kids: boolean): Promise<DiscoverPage | null> {
  const base: Params = { with_origin_country: code.toUpperCase(), include_adult: false, language, page: 1, ...params }
  const page = withoutMislabelled(code, await tmdbFetchSafe<DiscoverPage>(`discover/${kind}`, kids ? kidsDiscoverParams(kind, base) : base, DAY))
  if (!page || !kids) return page
  const results = await filterKidSafe(tagged(page, kind), kind, 20)
  // What the Kids filters let through, honestly: nothing left means nothing on record for Kids.
  return { ...page, results, total_results: results.length === 0 ? 0 : Math.max(results.length, page.total_results ?? 0) }
}

const today = () => new Date().toISOString().slice(0, 10)
const yearsAgo = (years: number) => `${new Date().getUTCFullYear() - years}-01-01`

/** The requests behind a country's tile and page. The first three are shared with the map. */
export const QUERIES = {
  popularFilms: { kind: 'movie', params: { sort_by: 'popularity.desc' } },
  popularSeries: { kind: 'tv', params: { sort_by: 'popularity.desc' } },
  knownFilms: { kind: 'movie', params: { sort_by: 'vote_count.desc' } },
  newFilms: { kind: 'movie', params: () => ({ sort_by: 'popularity.desc', 'primary_release_date.gte': yearsAgo(5), 'primary_release_date.lte': today() }) },
  favourites: { kind: 'movie', params: { sort_by: 'vote_average.desc', 'vote_count.gte': 10 } },
  classics: { kind: 'movie', params: { sort_by: 'vote_count.desc', 'primary_release_date.lte': '1989-12-31' } },
  firstFilm: { kind: 'movie', params: { sort_by: 'primary_release_date.asc', 'primary_release_date.gte': '1880-01-01' } },
} as const satisfies Record<string, { kind: Kind, params: Params | (() => Params) }>

export type QueryName = keyof typeof QUERIES

export function runQuery(code: ArabCountryCode, name: QueryName, language: string, kids: boolean) {
  const query = QUERIES[name]
  const params = typeof query.params === 'function' ? query.params() : query.params
  return countryDiscover(code, query.kind, params, language, kids)
}

export const itemsOf = (page: DiscoverPage | null, kind: Kind) => tagged(page, kind).filter((item) => item.poster_path)

/**
 * The country's film of the day: one of its best-known or most popular films with a poster, the
 * same all day for everyone (seeded by the date), a series when it has no films.
 */
export function filmOfTheDay(code: ArabCountryCode, date: string, pages: { known: DiscoverPage | null, popular: DiscoverPage | null, series: DiscoverPage | null }): MapTitle | null {
  const seen = new Set<number>()
  const films = [...itemsOf(pages.known, 'movie').slice(0, 8), ...itemsOf(pages.popular, 'movie').slice(0, 8)]
    .filter((item) => !seen.has(item.id) && seen.add(item.id))
  const pool = films.length > 0 ? films : itemsOf(pages.series, 'tv').slice(0, 8)
  if (pool.length === 0) return null
  // Prefer titles with a backdrop (the pick card and the room light look better with one).
  const wide = pool.filter((item) => item.backdrop_path)
  const choice = (wide.length >= 3 ? wide : pool)
  const item = choice[hash(`${date}:world-map:${code}`) % choice.length]
  return toMapTitle(item, item.media_type)
}

// ---------------------------------------------------------------------------------------------
// People born in the country.

/**
 * Who counts as born in each country: TMDB's place_of_birth (usually English, sometimes French or
 * Arabic) mentions the country or one of its main cities. Never a bare 'عمان' (Amman and Oman are
 * spelled alike), never a bare 'Tripoli' (Lebanon and Libya both have one), and South Sudan is not
 * Sudan.
 */
const BORN_IN: Partial<Record<ArabCountryCode, { match: RegExp, not?: RegExp }>> = {
  us: { match: /\bunited states\b|\busa\b|\bu\.s\.a?\b|america|new york|los angeles|hollywood|chicago|hollywood|hollywood/i },
  ca: { match: /\bcanada\b|toronto|montreal|vancouver|ottawa|quebec/i },
  mx: { match: /\bmexico\b|méxico|mexico city|ciudad de m[eé]xico|guadalajara|monterrey/i },
  br: { match: /\bbrazil\b|brasil|s[aã]o paulo|rio de janeiro|bras[ií]lia/i },
  gb: { match: /\bunited kingdom\b|\bengland\b|\bscotland\b|\bwales\b|london|manchester|birmingham|glasgow|edinburgh/i },
  fr: { match: /\bfrance\b|paris|lyon|marseille|toulouse|bordeaux/i },
  es: { match: /\bspain\b|espa[nñ]a|madrid|barcelona|valencia|seville|sevilla/i },
  dk: { match: /\bdenmark\b|danmark|copenhagen|k[øo]benhavn/i },
  pl: { match: /\bpoland\b|polska|warsaw|warszawa|krak[oó]w|gdansk/i },
  in: { match: /\bindia\b|mumbai|bombay|delhi|kolkata|calcutta|chennai|madras|hyderabad|bangalore|bengaluru/i },
  cn: { match: /\bchina\b|beijing|peking|shanghai|guangzhou|shenzhen|hong kong/i },
  jp: { match: /\bjapan\b|tokyo|osaka|kyoto|yokohama|nagoya/i },
  kr: { match: /\bkorea\b|seoul|busan|incheon/i },
  th: { match: /\bthailand\b|bangkok|chiang mai/i },
  ph: { match: /\bphilippines\b|manila|quezon|cebu|davao/i },
  id: { match: /\bindonesia\b|jakarta|surabaya|bandung|bali/i },
  nz: { match: /\bnew zealand\b|auckland|wellington|christchurch/i },
}

/** Lebanon, Pennsylvania; Palestine, Texas; Bethlehem, Pennsylvania; Cairo, Illinois... */
const ELSEWHERE = /\b(usa|u\.s\.a?\.?|united states)\b/i

/** Whether a TMDB place_of_birth is in this country. */
export function bornIn(code: ArabCountryCode, place: string | null | undefined): boolean {
  if (!place) return false
  const rule = BORN_IN[code]
  if (!rule) return false
  if (!rule.match.test(place) || (rule.not?.test(place) ?? false)) return false
  // Avoid US hometowns matching other countries' city names (Cairo IL, Palestine TX, …)
  if (code !== 'us' && ELSEWHERE.test(place)) return false
  return true
}

export type CountryPerson = { id: number, name: string, profile_path: string, knownFor: string, kind: Kind, workId: number }

/**
 * The people credited most often (cast and directors) across a country's best-known titles, kept
 * when they were born there (co-productions bring French, Belgian... casts). About 50 requests on a
 * cold cache, then a week of cache.
 */
export async function countryPeople(code: ArabCountryCode, titles: { id: number, media_type: Kind, title?: string, name?: string }[], language: string): Promise<CountryPerson[]> {
  const credits = await Promise.all(titles.map((title) =>
    tmdbFetchSafe<any>(title.media_type === 'movie' ? `movie/${title.id}/credits` : `tv/${title.id}/aggregate_credits`, { language }, WEEK)))
  const people = new Map<number, CountryPerson & { credits: number, score: number }>()
  credits.forEach((data, index) => {
    if (!data) return
    const work = titles[index]
    const cast = (data.cast ?? []).slice(0, 8)
    const directors = (data.crew ?? []).filter((member: any) => member.job === 'Director' || member.jobs?.some((job: any) => job.job === 'Director'))
    for (const [person, weight] of [...cast.map((p: any) => [p, 1] as const), ...directors.map((p: any) => [p, 1.2] as const)]) {
      if (!person.profile_path) continue
      const entry = people.get(person.id) ?? {
        id: person.id, name: person.name, profile_path: person.profile_path, knownFor: titleOf(work), kind: work.media_type, workId: work.id, credits: 0, score: 0,
      }
      entry.credits++
      entry.score += weight + (person.popularity ?? 0) / 100
      people.set(person.id, entry)
    }
  })
  const candidates = [...people.values()].sort((a, b) => b.credits - a.credits || b.score - a.score).slice(0, 32)
  const details = await Promise.all(candidates.map((person) => tmdbFetchSafe<any>(`person/${person.id}`, {}, WEEK)))
  return candidates
    .filter((_, index) => bornIn(code, details[index]?.place_of_birth))
    .slice(0, 18)
    .map(({ credits: _credits, score: _score, ...person }) => person)
}
