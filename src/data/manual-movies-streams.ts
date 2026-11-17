/**
 * MANUAL MOVIE STREAM LINKS (for Movi Player)
 * Keyed by TMDB movie ID only.
 *
 * These are direct playable URLs (any format movi-player supports:
 * mp4, mkv, webm, m3u8/HLS, mpd/DASH, HEVC, AV1, multi-audio, etc.).
 * They are shown first on the movie watch page and played with the
 * advanced in-browser Movi Player (no iframe, no desktop app).
 *
 * COMPACT FORMAT (easy to paste/edit):
 *   Row shape:   [label, url, quality?, note?]
 *
 * HOW TO ADD:
 *   'TMDB_ID': [
 *     ['1080p WEB-DL', 'https://example.com/stream.mkv', '1080p', 'English'],
 *     ['720p', 'https://cdn.example/movie.m3u8', '720p'],
 *   ],
 *
 * quality and note are optional — just omit them:
 *   ['Main', 'https://…']
 *
 * Multiple sources per movie are supported; the player lists them all.
 * Only movies (not TV). Paste any compatible streaming URL.
 */

export type ManualStream = {
  /** Display name in the source switcher (e.g. "1080p BluRay", "Movi Direct") */
  label: string
  /** Direct media URL playable by movi-player */
  url: string
  quality?: string
  note?: string
}

// ---- Compact (what you edit) ----
type CStream = [label: string, url: string, quality?: string, note?: string]

const RAW: Record<string, CStream[]> = {
  // ── TMDB 1291595 ─────────────────────────────────────────────
  // Example: replace the placeholder URLs with real stream links
  '656908': [
    ['1080p Direct', 'https://f2l.reaperzclub.dpdns.org/AgADuhxp18myv', '1080p', 'Main'],
    ['720p HLS', 'https://f2l1.reaperzclub.dpdns.org/AgADDgxp1ek3h', '720p'],
  ],

  // Add more MOVIES below (TMDB ID as string key):
  // '550': [
  //   ['BluRay 1080p', 'https://…/fight-club.mkv', '1080p'],
  // ],
}

// ---- Expand compact → full shape ----
function expand(list: CStream[]): ManualStream[] {
  return list.map(([label, url, quality, note]) => ({
    label,
    url,
    quality,
    note,
  }))
}

export const MANUAL_MOVIES_STREAMS: Record<string, ManualStream[]> = Object.fromEntries(
  Object.entries(RAW).map(([id, list]) => [id, expand(list)]),
)

/** Look up manual stream sources for a movie by TMDB ID. Returns [] if none. */
export function getManualMovieStreams(
  tmdbId: string | number | null | undefined,
): ManualStream[] {
  if (tmdbId == null || tmdbId === '') return []
  return MANUAL_MOVIES_STREAMS[String(tmdbId)] ?? []
}

/** Whether this movie has any manual (Movi) streams. */
export function hasManualMovieStreams(
  tmdbId: string | number | null | undefined,
): boolean {
  return getManualMovieStreams(tmdbId).length > 0
}
