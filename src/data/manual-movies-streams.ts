/**
 * MANUAL MOVIE STREAM LINKS (for Movi Player)
 * Keyed by TMDB movie ID only.
 *
 * ============================================================================
 * MULTI-SOURCE / MULTI-QUALITY SYSTEM
 * ============================================================================
 *
 * You can now paste MULTIPLE URLs at once (one URL per line).
 * TunisiaClick automatically:
 *   • detects host
 *   • extracts a playable URL when possible
 *   • detects quality from filename / path (2160, 4K, 1080, 720, 480 …)
 *   • builds a unified quality-selection list
 *
 * Supported input styles (you can mix them):
 *
 * 1) Classic tuple (still fully supported):
 *    ['1080p WEB-DL', 'https://example.com/stream.mkv', '1080p', 'English']
 *
 * 2) Raw URL only (quality auto-detected):
 *    'https://cdn.example/movie_2160.mkv'
 *
 * 3) Multi-line paste block (recommended for many sources):
 *    Use the helper `fromPaste()` below.
 *
 * Example multi-line paste:
 *
 *   '656908': fromPaste(`
 *     https://f2l.reaperzclub.dpdns.org/AgADuhxp18myv
 *     https://f2l1.reaperzclub.dpdns.org/AgADDgxp1ek3h
 *     https://hubcloud.mov/drive/zejzsvtufsuqzad
 *     https://d237157.fpvcdn.com/key=…/1854609_720.mp4
 *     https://d237157.fpvcdn.com/key=…/1854609_2160.mkv
 *   `),
 *
 * Quality detection priority:
 *   1. Explicit quality field (manual override)
 *   2. Filename / URL patterns (2160p, 4K, 1080p, 720p, 480p …)
 *   3. Falls back to "Source N"
 *
 * Multiple sources for the same movie share one entry.
 * No need to create separate movie records per resolution.
 */

import {
  autoMapSources,
  buildSourceLabel,
  compareQuality,
  detectQualityFromString,
  normalizeQuality,
  parseMultiUrlPaste,
  type DetectedQuality,
  QUALITY_LABELS,
} from '@/src/lib/quality-detect'

export type ManualStream = {
  /** Display name in the source switcher (e.g. "1080p BluRay", "Movi Direct") */
  label: string
  /** Direct media URL playable by movi-player */
  url: string
  /** Canonical quality (2160p / 1080p / 720p …). Used for grouping & sorting. */
  quality?: string
  note?: string
  /** Optional stable id for admin reordering / editing */
  id?: string
}

// ---- Compact input types ----
type CStream =
  | [label: string, url: string, quality?: string, note?: string]
  | string // raw URL – quality auto-detected

/**
 * Helper: turn a multi-line paste of URLs into the compact list
 * that the rest of the system expects.
 *
 * Usage inside RAW:
 *   'TMDB_ID': fromPaste(`
 *     https://host1/…/movie_2160.mkv
 *     https://host2/…/movie_1080.mp4
 *     https://host3/…
 *   `),
 */
export function fromPaste(text: string): CStream[] {
  return parseMultiUrlPaste(text)
}

// ---- Compact (what you edit) ----
const RAW: Record<string, CStream[]> = {
  // ── TMDB 656908 ─────────────────────────────────────────────
  // Example showing mixed classic + raw URL styles.
  // Replace with real links for your titles.
  '656908': [
    ['1080p Direct', 'https://f2l.reaperzclub.dpdns.org/AgADuhxp18myv', '1080p', 'Main'],
    ['720p HLS', 'https://f2l1.reaperzclub.dpdns.org/AgADDgxp1ek3h', '720p'],
    // Raw URL – quality will be auto-detected from the path if possible
    // 'https://d237157.fpvcdn.com/key=…/1854609_2160.mkv',
  ],

  // ── TMDB 1368337 ────────────────────────────────────────────
  '1368337': fromPaste(`
    https://f2l1.reaperzclub.dpdns.org/xp1ep9j?hash=AgADyA&dl=1
    https://f2l1.reaperzclub.dpdns.org/xp1ep9f?hash=AgADtg&dl=1
    https://f2l2.reaperzclub.dpdns.org/xp1dcit?hash=AgADoS&dl=1
    https://f2l3.reaperzclub.dpdns.org/AgADrSxp1cxiu
    https://stream.mortalflix.xyz/download?path=XekwlO62
    https://stream.mortalflix.xyz/download?path=XekwlO62&dl=0
    https://stream.mortalflix.xyz/download?path=XekwlO62&dl=1
    https://avtshare01.rz.tu-ilmenau.de/avt-vqdb-uhd-1/test_1/segments/bigbuck_bunny_8bit_2000kbps_720p_60.0fps_vp9.mkv
  `),

  // ── Example of pure multi-line paste style ──────────────────
  // '550': fromPaste(`
  //   https://cdn.example/fight-club_2160.mkv
  //   https://cdn.example/fight-club_1080.mp4
  //   https://cdn.example/fight-club_720.m3u8
  //   https://another-host.com/fc_480.mp4
  // `),

  // Add more MOVIES below (TMDB ID as string key):
  // '123456': fromPaste(`
  //   https://…
  //   https://…
  // `),
}

// ---- Expand compact → full shape with auto quality detection ----
function expand(list: CStream[]): ManualStream[] {
  const sources: ManualStream[] = []

  for (let i = 0; i < list.length; i++) {
    const item = list[i]

    if (typeof item === 'string') {
      // Raw URL
      const url = item.trim()
      if (!url) continue
      const quality = detectQualityFromString(url)
      sources.push({
        url,
        label: quality !== 'unknown' ? QUALITY_LABELS[quality] : `Source ${i + 1}`,
        quality,
        id: `auto-${i}`,
      })
      continue
    }

    // Classic tuple
    const [label, url, quality, note] = item
    if (!url?.trim()) continue
    const q = quality ? normalizeQuality(quality) : detectQualityFromString(url)
    sources.push({
      label: label || buildSourceLabel({ url, quality: q, note }),
      url: url.trim(),
      quality: q,
      note,
      id: `manual-${i}`,
    })
  }

  // Sort highest quality first so the player source bar feels natural
  sources.sort((a, b) => compareQuality(a.quality || 'unknown', b.quality || 'unknown'))
  return sources
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

/**
 * Convenience: return sources grouped by canonical quality.
 * Useful for future admin UIs or advanced player quality menus.
 */
export function getManualMovieStreamsByQuality(
  tmdbId: string | number | null | undefined,
): Record<DetectedQuality, ManualStream[]> {
  const list = getManualMovieStreams(tmdbId)
  const groups: Record<string, ManualStream[]> = {}
  for (const s of list) {
    const q = normalizeQuality(s.quality) as DetectedQuality
    if (!groups[q]) groups[q] = []
    groups[q].push(s)
  }
  return groups as Record<DetectedQuality, ManualStream[]>
}

// Re-export helpers so admin tooling / future UI can import from one place
export {
  autoMapSources,
  buildSourceLabel,
  detectQualityFromString,
  normalizeQuality,
  parseMultiUrlPaste,
  QUALITY_LABELS,
  type DetectedQuality,
}
