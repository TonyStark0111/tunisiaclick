'use server'

import { getManualDownloads, type ManualDownloadEntry } from '@/src/data/manual-downloads'

/**
 * Server action: return the manual download entry for a TMDB ID, or null.
 * Safe to call from client components.
 */
export async function fetchManualDownloads(
  tmdbId: string | number | null | undefined,
): Promise<ManualDownloadEntry | null> {
  return getManualDownloads(tmdbId)
}
