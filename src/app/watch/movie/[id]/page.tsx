import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import WatchPlayer from '@/src/components/detail/WatchPlayer'
import { TmdbError, tmdbFetch, tmdbFetchSafe } from '@/src/lib/tmdb'
import { catalogueLanguage, localizeDetail, logoLanguages, translatedRecord } from '@/src/lib/tmdb-locale'
import { getLocale } from '@/src/lib/i18n/server'
import KidsBlocked from '@/src/components/profiles/KidsBlocked'
import { filterKidSafe, isKidSafe } from '@/src/lib/kids'
import { getActiveProfile, getKidsMode } from '@/src/lib/profiles'
import { pageMetadata } from '@/src/lib/seo'
import { getProviderTemplates } from '@/src/lib/stream-providers'
import { ratingSummary } from '@/src/lib/social/ratings'
import { readSoundtrack } from '@/src/lib/soundtrack'
import { videoExtras } from '@/src/lib/extras'
import { trailerLanguages } from '@/src/lib/media-assets'
import { similarTabs, variationFacts } from '@/src/lib/variations'
import { withTimeout } from '@/src/lib/with-timeout'

type Props = { params: { id: string } }

const isValidId = (id: string) => /^\d+$/.test(id)

async function getMovie(id: string, imageLanguages = 'en,null') {
  if (!isValidId(id)) notFound()
  try {
    return await tmdbFetch(`movie/${id}`, {
      append_to_response: 'images,credits,videos,external_ids',
      include_image_language: imageLanguages,
      include_video_language: 'en,ar,fr,null',
    })
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) notFound()
    throw error
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isValidId(params.id)) return {}
  const locale = getLocale()
  const [english, translated] = await Promise.all([
    tmdbFetchSafe(`movie/${params.id}`),
    translatedRecord('movie', params.id, locale),
  ])
  if (!english) return {}
  const movie = localizeDetail(english, translated, locale)
  const year = movie.release_date?.substring(0, 4)
  return pageMetadata({
    title: `Watch ${movie.title}${year ? ` (${year})` : ''}`,
    description: movie.overview,
    path: `/watch/movie/${params.id}`,
    card: false,
  })
}

export default async function WatchMoviePage({ params }: Props) {
  const locale = getLocale()
  const [movie, recommendations, translated, kids, active] = await Promise.all([
    getMovie(params.id, logoLanguages(locale)),
    tmdbFetchSafe(`movie/${params.id}/recommendations`, { language: catalogueLanguage(locale) }),
    translatedRecord('movie', params.id, locale),
    getKidsMode(),
    getActiveProfile(),
  ])

  if (kids && !(await isKidSafe(movie, 'movie'))) return <KidsBlocked />

  const id = String(movie.id ?? params.id)
  const signedIn = !!active
  const [similar, summary, soundtrack] = await Promise.all([
    kids ? filterKidSafe(recommendations?.results ?? [], 'movie') : recommendations?.results ?? [],
    signedIn ? null : withTimeout(ratingSummary('movie', id), 1500, { average: null, countLabel: null }),
    withTimeout(readSoundtrack('movie', id), 1200, { state: 'unknown' as const }),
  ])

  const data = localizeDetail(movie, translated, locale)
  const { groups } = videoExtras(movie.videos?.results, trailerLanguages(locale))
  const imdbId: string | undefined = movie.imdb_id || movie.external_ids?.imdb_id || undefined
  const year = data.release_date?.substring(0, 4)

  return (
    <WatchPlayer
      kind="movie"
      id={id}
      title={data.title ?? ''}
      poster_path={data.poster_path}
      backdrop_path={data.backdrop_path}
      imdbId={imdbId}
      providers={getProviderTemplates()}
      year={year}
      kids={kids}
      signedIn={signedIn}
      ratings={signedIn || (summary?.average !== null && summary?.average !== undefined)}
      similar={similar}
      tabs={similarTabs(similar.length, variationFacts('movie', movie), kids, locale)}
      extras={groups}
      soundtrack={
        soundtrack.state === 'found' && kids
          ? { state: 'found', album: { ...soundtrack.album, link: null } }
          : soundtrack
      }
      data={data}
    />
  )
}
