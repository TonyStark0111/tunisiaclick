'use server'

import {
  getManualMovieStreams,
  hasManualMovieStreams,
  type ManualStream,
} from '@/src/data/manual-movies-streams'

export type { ManualStream }

/**
 * Server action: return manual (Movi Player) stream sources for a TMDB movie ID.
 * Movies only. Returns [] when none are configured.
 */
export async function fetchManualMovieStreams(
  tmdbId: string | number | null | undefined,
): Promise<ManualStream[]> {
  return getManualMovieStreams(tmdbId)
}

export async function movieHasManualStreams(
  tmdbId: string | number | null | undefined,
): Promise<boolean> {
  return hasManualMovieStreams(tmdbId)
}
