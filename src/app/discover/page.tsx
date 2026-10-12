import DiscoverFilters from '@/src/components/DiscoverFilters'
import MediaGrid, { EmptyState } from '@/src/components/MediaGrid'
import PageHeader from '@/src/components/browse/PageHeader'
import SegmentedLinks from '@/src/components/browse/SegmentedLinks'
import PageNav from '@/src/components/PageNav'
import { getList, parsePage } from '@/src/lib/lists'
import { catalogueLanguage, genreList } from '@/src/lib/tmdb-locale'
import { createTranslator } from '@/src/lib/i18n'
import { getLocale, getT } from '@/src/lib/i18n/server'
import { kidsDiscoverParams } from '@/src/lib/kids'
import { getKidsMode } from '@/src/lib/profiles'
import { pageMetadata } from '@/src/lib/seo'

export const dynamic = 'force-dynamic'
export const generateMetadata = () => {
  const t = getT()
  return pageMetadata({ title: t('discover.title'), description: t('discover.subtitle'), path: '/discover', card: 'discover' })
}

type SearchParams = {
  page?: string
  type?: string
  genre?: string
  year?: string
  rating?: string
  sort?: string
  runtime?: string
  family?: string
  language?: string
}

/** Allowed ISO 639-1 codes for the original-language filter. */
const LANG_CODES = new Set([
  'en', 'ko', 'ja', 'id', 'th', 'hi', 'ta', 'te', 'ml', 'kn',
  'zh', 'es', 'ru', 'fr', 'de', 'it', 'pt', 'bn', 'tr',
])

/** Runtime filter (episode length for TV): under 90 min, under 2 h, or a 2.5 h+ epic. */
function runtimeParams(kind: 'movie' | 'tv', runtime?: string): Record<string, number> {
  const floor = kind === 'movie' ? 60 : 15
  if (runtime === '90') return kind === 'movie' ? { 'with_runtime.gte': floor, 'with_runtime.lte': 95 } : { 'with_runtime.gte': floor, 'with_runtime.lte': 30 }
  if (runtime === '120') return kind === 'movie' ? { 'with_runtime.gte': floor, 'with_runtime.lte': 120 } : { 'with_runtime.gte': floor, 'with_runtime.lte': 50 }
  if (runtime === 'epic') return kind === 'movie' ? { 'with_runtime.gte': 150 } : { 'with_runtime.gte': 55 }
  return {}
}

// Only well-formed values reach TMDB; anything else is ignored.
function parseFilters(searchParams: SearchParams) {
  const currentYear = new Date().getFullYear()
  const year = /^\d{4}$/.test(searchParams.year ?? '') && Number(searchParams.year) >= 1900 && Number(searchParams.year) <= currentYear + 1
    ? searchParams.year : undefined
  const sortRaw = searchParams.sort ?? ''
  const sort = ['popular', 'newest', 'top'].includes(sortRaw) ? sortRaw : 'default'
  return {
    genre: /^\d+$/.test(searchParams.genre ?? '') ? searchParams.genre : undefined,
    year,
    rating: ['6', '7', '8'].includes(searchParams.rating ?? '') ? searchParams.rating : undefined,
    sort,
    runtime: ['90', '120', 'epic'].includes(searchParams.runtime ?? '') ? searchParams.runtime : undefined,
    family: searchParams.family === '1' ? '1' : undefined,
    language: LANG_CODES.has(searchParams.language ?? '') ? searchParams.language : undefined,
  }
}

export default async function DiscoverPage({ searchParams }: { searchParams: SearchParams }) {
  const page = parsePage(searchParams.page)
  // Anime is a special TV-based catalogue (Japanese Animation). Media kind stays 'tv' for cards/links.
  const isAnime = searchParams.type === 'anime'
  const kind: 'movie' | 'tv' = searchParams.type === 'tv' || isAnime ? 'tv' : 'movie'
  const filters = parseFilters(searchParams)
  const locale = getLocale()
  const t = createTranslator(locale)

  const dateField = kind === 'movie' ? 'primary_release_date' : 'first_air_date'
  const today = new Date().toISOString().slice(0, 10)
  // Default = original catalogue order (popularity, no ranking gate).
  // Most popular = popularity with a vote-count floor. Newest / Top rated as before.
  const sortParams: Record<string, string | number> =
    filters.sort === 'top'
      ? { sort_by: 'vote_average.desc', 'vote_count.gte': 300 }
      : filters.sort === 'newest'
        // Newest *released*: TMDB otherwise lists far-future placeholders first.
        ? { sort_by: `${dateField}.desc`, [`${dateField}.lte`]: today, 'vote_count.gte': 20 }
        : filters.sort === 'popular'
          ? { sort_by: 'popularity.desc', 'vote_count.gte': 100 }
          : { sort_by: 'popularity.desc' }

  // Anime: always Japanese + Animation (genre 16). Extra user genre is AND-ed when present.
  // Language filter is used for Movies/TV; Anime tab keeps Japanese.
  const animeGenre = filters.genre && filters.genre !== '16' ? `16,${filters.genre}` : '16'
  const originalLanguage = isAnime ? 'ja' : filters.language

  const params = {
    ...sortParams,
    include_adult: false,
    with_genres: isAnime ? animeGenre : filters.genre,
    ...(originalLanguage ? { with_original_language: originalLanguage } : {}),
    ...(filters.year ? { [kind === 'movie' ? 'primary_release_year' : 'first_air_date_year']: filters.year } : {}),
    'vote_average.gte': filters.rating,
    // "I have 90 minutes": TMDB lists unknown runtimes as 0, so short filters also need a floor.
    ...runtimeParams(kind, filters.runtime),
  }
  const kids = await getKidsMode()
  // "Family-friendly" uses the same rating rules as Kids profiles.
  const familyOnly = kids || filters.family === '1'

  const language = catalogueLanguage(locale)
  const [{ results, totalPages, failed }, genres] = await Promise.all([
    getList(`discover/${kind}`, page, { ...(familyOnly ? kidsDiscoverParams(kind, params) : params), language }),
    genreList(kind, locale),
  ])

  return (
    <div className="pb-10">
      <PageHeader title={t('discover.title')} subtitle={t('discover.subtitle')}>
        {/* Switching type resets the filters: genre ids differ between movies and TV. */}
        <SegmentedLinks
          label={t('browse.typeSwitch')}
          items={[
            { href: '/discover', label: t('common.movies'), active: !isAnime && kind === 'movie' },
            { href: '/discover?type=tv', label: t('common.tvShows'), active: !isAnime && kind === 'tv' },
            { href: '/discover?type=anime', label: t('common.anime'), active: isAnime },
          ]}
        />
      </PageHeader>
      <DiscoverFilters genres={genres} values={filters} />
      <div className="page-x mt-8">
        {failed
          ? <EmptyState>{t('common.listFailed')}</EmptyState>
          : results.length === 0
            ? <EmptyState>{t('discover.noMatch')}</EmptyState>
            : <MediaGrid items={results} kind={kind} />}
        <PageNav currentPage={page} totalPages={totalPages} />
      </div>
    </div>
  )
}
