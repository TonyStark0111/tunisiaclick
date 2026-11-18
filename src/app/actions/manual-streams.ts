'use server'

import {
  getManualMovieStreams,
  hasManualMovieStreams,
  getManualMovieStreamsByQuality,
  type ManualStream,
} from '@/src/data/manual-movies-streams'

export type { ManualStream }

/**
 * Server action: return manual (Movi Player) stream sources for a TMDB movie ID.
 * Movies only. Returns [] when none are configured.
 *
 * Sources are already sorted highest-quality first and carry auto-detected
 * (or manually overridden) quality labels.
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

/**
 * Optional: sources grouped by canonical quality (2160p, 1080p, …).
 * Useful for admin tools or advanced quality menus.
 */
export async function fetchManualMovieStreamsByQuality(
  tmdbId: string | number | null | undefined,
) {
  return getManualMovieStreamsByQuality(tmdbId)
}
