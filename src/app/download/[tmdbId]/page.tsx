import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import DownloadHub from '@/src/components/detail/DownloadHub'
import { getManualMovieDownloads } from '@/src/data/manual-movies-downloads'
import { getManualSeriesDownloads } from '@/src/data/manual-series-downloads'
import { tmdbFetchSafe } from '@/src/lib/tmdb'

type Props = {
  params: Promise<{ tmdbId: string }>
  searchParams: Promise<{
    type?: string
    s?: string
    e?: string
    season?: string
    episode?: string
  }>
}

/**
 * Unified download hub.
 * Route: /download/<tmdbId>?type=movie|tv&s=&e=
 *
 * Three options:
 *   1. Moviezone direct servers (02Downloader, NxSha, VidSync, VidVault)
 *   2. Manual curated links (previous Download 2)
 *   3. Torrent magnets (previous Download / DownloadDialog)
 */
export default async function DownloadPage({ params, searchParams }: Props) {
  const { tmdbId } = await params
  const sp = await searchParams

  if (!/^\d+$/.test(tmdbId)) notFound()

  const kind: 'movie' | 'tv' = sp.type === 'tv' ? 'tv' : 'movie'
  const season = Math.max(1, parseInt(sp.s || sp.season || '1', 10) || 1)
  const episode = Math.max(1, parseInt(sp.e || sp.episode || '1', 10) || 1)

  const path = kind === 'tv' ? `tv/${tmdbId}` : `movie/${tmdbId}`
  const detail = await tmdbFetchSafe(path, {
    append_to_response: 'external_ids',
  })

  const title =
    (kind === 'tv' ? detail?.name : detail?.title) ||
    `Title ${tmdbId}`
  const year = (
    kind === 'tv' ? detail?.first_air_date : detail?.release_date
  )?.substring(0, 4)
  const imdbId: string | undefined =
    detail?.external_ids?.imdb_id || detail?.imdb_id || undefined

  const movieManual = kind === 'movie' ? getManualMovieDownloads(tmdbId) : null
  const seriesManual = kind === 'tv' ? getManualSeriesDownloads(tmdbId) : null

  const backHref =
    kind === 'tv'
      ? `/watch/tv/${tmdbId}?s=${season}&e=${episode}`
      : `/watch/movie/${tmdbId}`

  return (
    <DownloadHub
      tmdbId={tmdbId}
      kind={kind}
      title={title}
      year={year}
      season={season}
      episode={episode}
      imdbId={imdbId}
      backHref={backHref}
      movieManual={movieManual}
      seriesManual={seriesManual}
    />
  )
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { tmdbId } = await params
  const sp = await searchParams
  const kind = sp.type === 'tv' ? 'tv' : 'movie'
  const path = kind === 'tv' ? `tv/${tmdbId}` : `movie/${tmdbId}`
  const detail = await tmdbFetchSafe(path)
  const title = (kind === 'tv' ? detail?.name : detail?.title) || 'Download'
  return {
    title: `${title} · Download`,
    robots: { index: false, follow: false },
  }
}
