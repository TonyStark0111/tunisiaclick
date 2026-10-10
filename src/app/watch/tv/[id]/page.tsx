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

type Props = {
  params: { id: string }
  searchParams: { s?: string; e?: string; season?: string; episode?: string }
}

const isValidId = (id: string) => /^\d+$/.test(id)

function parseSeasonEpisode(sp: Props['searchParams']) {
  const season = Math.max(1, parseInt(sp.s || sp.season || '1', 10) || 1)
  const episode = Math.max(1, parseInt(sp.e || sp.episode || '1', 10) || 1)
  return { season, episode }
}

async function getShow(id: string, imageLanguages = 'en,null') {
  if (!isValidId(id)) notFound()
  try {
    return await tmdbFetch(`tv/${id}`, {
      append_to_response: 'images,credits,videos,external_ids',
      include_image_language: imageLanguages,
      include_video_language: 'en,ar,fr,null',
    })
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) notFound()
    throw error
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  if (!isValidId(params.id)) return {}
  const locale = getLocale()
  const { season, episode } = parseSeasonEpisode(searchParams)
  const [english, translated] = await Promise.all([
    tmdbFetchSafe(`tv/${params.id}`),
    translatedRecord('tv', params.id, locale),
  ])
  if (!english) return {}
  const show = localizeDetail(english, translated, locale)
  return pageMetadata({
    title: `Watch ${show.name} S${season}:E${episode}`,
    description: show.overview,
    path: `/watch/tv/${params.id}`,
    card: false,
  })
}

export default async function WatchTvPage({ params, searchParams }: Props) {
  const locale = getLocale()
  const { season, episode } = parseSeasonEpisode(searchParams)
  const [show, recommendations, translated, kids, active] = await Promise.all([
    getShow(params.id, logoLanguages(locale)),
    tmdbFetchSafe(`tv/${params.id}/recommendations`, { language: catalogueLanguage(locale) }),
    translatedRecord('tv', params.id, locale),
    getKidsMode(),
    getActiveProfile(),
  ])

  if (kids && !(await isKidSafe(show, 'tv'))) return <KidsBlocked />

  const id = String(show.id ?? params.id)
  const signedIn = !!active
  const [similar, summary, soundtrack] = await Promise.all([
    kids ? filterKidSafe(recommendations?.results ?? [], 'tv') : recommendations?.results ?? [],
    signedIn ? null : withTimeout(ratingSummary('tv', id), 1500, { average: null, countLabel: null }),
    withTimeout(readSoundtrack('tv', id), 1200, { state: 'unknown' as const }),
  ])

  const data = localizeDetail(show, translated, locale)
  const { groups } = videoExtras(show.videos?.results, trailerLanguages(locale))
  const imdbId: string | undefined = show.external_ids?.imdb_id || undefined
  const year = data.first_air_date?.substring(0, 4)

  return (
    <WatchPlayer
      kind="tv"
      id={id}
      title={data.name ?? ''}
      poster_path={data.poster_path}
      backdrop_path={data.backdrop_path}
      imdbId={imdbId}
      providers={getProviderTemplates()}
      year={year}
      season={season}
      episode={episode}
      kids={kids}
      signedIn={signedIn}
      ratings={signedIn || (summary?.average !== null && summary?.average !== undefined)}
      similar={similar}
      tabs={similarTabs(similar.length, variationFacts('tv', show), kids, locale)}
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
