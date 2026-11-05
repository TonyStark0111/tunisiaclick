/**
 * MovieZone-style upcoming releases.
 * Uses discover/movie (not /movie/upcoming) with a short release window:
 * yesterday → +3 months, multi-industry sources, strict release_date >= today.
 */
import { tmdbFetchSafe } from '@/src/lib/tmdb'

export type UpcomingMovie = {
  id: number
  title?: string
  name?: string
  backdrop_path?: string | null
  poster_path?: string | null
  release_date?: string
  overview?: string
  genre_ids?: number[]
  original_language?: string
  popularity?: number
}

const WINDOW_MONTHS = 3

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10)
}

/** Yesterday → +3 months (same window as MovieZone). */
function upcomingWindow() {
  const from = new Date()
  from.setDate(from.getDate() - 1)
  const gte = isoDay(from)
  const to = new Date(from)
  to.setMonth(to.getMonth() + WINDOW_MONTHS)
  return { gte, lte: isoDay(to) }
}

function todayISO() {
  return isoDay(new Date())
}

type Source = { key: string; deep: boolean; params: Record<string, string> }

/** Same industry mix as MovieZone so the feed is not Hollywood-only. */
const SOURCES: Source[] = [
  { key: 'hollywood', deep: true, params: { with_original_language: 'en' } },
  { key: 'indian', deep: true, params: { with_origin_country: 'IN' } },
  { key: 'bollywood', deep: false, params: { with_original_language: 'hi' } },
  { key: 'tollywood', deep: false, params: { with_original_language: 'te' } },
  { key: 'tamil', deep: false, params: { with_original_language: 'ta' } },
  { key: 'anime', deep: false, params: { with_genres: '16', with_original_language: 'ja' } },
  { key: 'korean', deep: false, params: { with_original_language: 'ko' } },
]

function discoverParams(page: number, extra: Record<string, string>, language?: string) {
  const w = upcomingWindow()
  return {
    language: language || 'en-US',
    page,
    sort_by: 'popularity.desc',
    'primary_release_date.gte': w.gte,
    'primary_release_date.lte': w.lte,
    include_adult: false,
    ...extra,
  }
}

const INDUSTRY_BY_LANG: Record<string, string> = {
  en: 'hollywood',
  hi: 'bollywood',
  te: 'tollywood',
  ta: 'tamil',
  ml: 'malayalam',
  kn: 'kannada',
  mr: 'marathi',
  bn: 'bengali',
  pa: 'punjabi',
  gu: 'gujarati',
  ko: 'korean',
  zh: 'chinese',
  cn: 'chinese',
}

function industryOf(m: UpcomingMovie) {
  const lang = m.original_language || 'en'
  if (lang === 'ja') {
    return (m.genre_ids || []).includes(16) ? 'anime' : 'japanese'
  }
  return INDUSTRY_BY_LANG[lang] || 'world'
}

/** Chronological list with a max run of 3 per industry (MovieZone interleave). */
function interleaveByIndustry(list: UpcomingMovie[], maxRun = 3): UpcomingMovie[] {
  if (list.length < 3) return list.slice()
  const buckets = new Map<string, UpcomingMovie[]>()
  for (const m of list) {
    const key = industryOf(m)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(m)
  }
  for (const arr of buckets.values()) {
    arr.sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''))
  }
  const out: UpcomingMovie[] = []
  let last = ''
  let run = 0
  while (out.length < list.length) {
    let picked: UpcomingMovie | null = null
    let pickedKey = ''
    let bestDate = '9999-99-99'
    for (const [key, arr] of buckets) {
      if (!arr.length) continue
      if (key === last && run >= maxRun) continue
      const d = arr[0].release_date || '9999'
      if (d < bestDate) {
        bestDate = d
        picked = arr[0]
        pickedKey = key
      }
    }
    if (!picked) {
      // force pick next soonest ignoring run cap
      for (const [key, arr] of buckets) {
        if (!arr.length) continue
        const d = arr[0].release_date || '9999'
        if (d < bestDate) {
          bestDate = d
          picked = arr[0]
          pickedKey = key
        }
      }
    }
    if (!picked) break
    buckets.get(pickedKey)!.shift()
    if (pickedKey === last) run++
    else {
      last = pickedKey
      run = 1
    }
    out.push(picked)
  }
  return out
}

/**
 * Fetch upcoming movies the MovieZone way.
 * Returns only titles with a poster/backdrop and release_date >= today.
 */
export async function getUpcomingReleases(language?: string, limit = 36): Promise<UpcomingMovie[]> {
  const today = todayISO()
  const requests: Promise<{ results?: UpcomingMovie[] } | null>[] = []

  for (const src of SOURCES) {
    if (src.deep) {
      requests.push(tmdbFetchSafe('discover/movie', discoverParams(1, src.params, language)))
      requests.push(tmdbFetchSafe('discover/movie', discoverParams(2, src.params, language)))
    } else {
      requests.push(tmdbFetchSafe('discover/movie', discoverParams(1, src.params, language)))
    }
  }

  const results = await Promise.all(requests)
  const seen = new Set<number>()
  let movies: UpcomingMovie[] = []

  for (const res of results) {
    for (const m of res?.results || []) {
      if (!m?.id || seen.has(m.id)) continue
      // MovieZone filter: must have poster, must have release_date, must be today or later
      if (!m.poster_path && !m.backdrop_path) continue
      if (!m.release_date || m.release_date < today) continue
      seen.add(m.id)
      movies.push(m)
    }
  }

  movies.sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''))
  movies = interleaveByIndustry(movies)
  return movies.slice(0, limit)
}
