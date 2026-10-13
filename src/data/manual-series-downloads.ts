/**
 * MANUAL SERIES (TV) DOWNLOAD LINKS
 * Keyed by TMDB TV show ID only.
 *
 * COMPACT FORMAT:
 *   Row:   [mainTitle, note, groups]
 *   Group: [color, title, links]
 *   Link:  [label, url, quality?, size?]
 *
 * HOW TO ADD:
 *   'TMDB_ID': ['Download Links', 'note', [
 *     ['red', 'Season 1', [
 *       ['S01E01 1080p', 'https://url', '1080p', '1.2 GB'],
 *     ]],
 *   ]],
 *
 * quality and size are optional:
 *   ['Label', 'https://url']
 */

export type ManualLinkColor =
  | 'red' | 'orange' | 'green' | 'blue'
  | 'purple' | 'yellow' | 'white' | 'cyan'

export type ManualLink = {
  label: string
  url: string
  quality?: string
  size?: string
}

export type ManualGroup = {
  title: string
  color: ManualLinkColor
  links: ManualLink[]
}

export type ManualDownloadEntry = {
  mainTitle: string
  note?: string
  groups: ManualGroup[]
}

// ---- Compact format (edit RAW only) ----
type CLink = [label: string, url: string, quality?: string, size?: string]
type CGroup = [color: ManualLinkColor, title: string, links: CLink[]]
type CRow = [mainTitle: string, note: string, groups: CGroup[]]

const RAW: Record<string, CRow> = {
  // ── Example: TMDB TV show ID 1396 (Breaking Bad) ─────────────
  // '1396': ['Download Links', 'Breaking Bad', [
  //   ['red', 'Season 1', [
  //     ['S01E01 1080p', 'https://example.com/bb-s01e01', '1080p', '1.2 GB'],
  //     ['S01E02 1080p', 'https://example.com/bb-s01e02', '1080p', '1.1 GB'],
  //   ]],
  //   ['blue', 'Season 2', [
  //     ['S02E01 1080p', 'https://example.com/bb-s02e01', '1080p', '1.3 GB'],
  //   ]],
  // ]],

  // Add more SERIES below:
}

// ---- Expand compact format → full shape ----
function expand(row: CRow): ManualDownloadEntry {
  const [mainTitle, note, groups] = row

  return {
    mainTitle,
    note,
    groups: groups.map(([color, title, links]) => ({
      color,
      title,
      links: links.map(([label, url, quality, size]) => ({
        label,
        url,
        quality,
        size,
      })),
    })),
  }
}

export const MANUAL_SERIES_DOWNLOADS: Record<string, ManualDownloadEntry> =
  Object.fromEntries(
    Object.entries(RAW).map(([id, row]) => [id, expand(row)]),
  )

/** Look up series manual downloads by TMDB TV show ID. */
export function getManualSeriesDownloads(
  tmdbId: string | number | null | undefined,
): ManualDownloadEntry | null {
  if (tmdbId == null || tmdbId === '') return null
  return MANUAL_SERIES_DOWNLOADS[String(tmdbId)] ?? null
}
