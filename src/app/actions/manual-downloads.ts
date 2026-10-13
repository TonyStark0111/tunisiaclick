'use server'

import { getManualMovieDownloads, type ManualDownloadEntry as MovieEntry } from '@/src/data/manual-movies-downloads'
import { getManualSeriesDownloads, type ManualDownloadEntry as SeriesEntry } from '@/src/data/manual-series-downloads'

export type ManualDownloadEntry = MovieEntry | SeriesEntry

/**
 * Server action: return the manual download entry for a TMDB ID.
 * Pass kind = 'movie' | 'tv' to force which file is used.
 * If kind is omitted, tries movie first, then series.
 */
export async function fetchManualDownloads(
  tmdbId: string | number | null | undefined,
  kind?: 'movie' | 'tv',
): Promise<ManualDownloadEntry | null> {
  if (kind === 'movie') return getManualMovieDownloads(tmdbId)
  if (kind === 'tv') return getManualSeriesDownloads(tmdbId)
  return getManualMovieDownloads(tmdbId) ?? getManualSeriesDownloads(tmdbId)
}
