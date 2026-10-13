/**
 * MANUAL SERIES (TV) DOWNLOAD LINKS
 * Keyed by TMDB TV show ID only.
 *
 * COMPACT FORMAT (easy to edit):
 *   Row shape:   [mainTitle, note, groups]
 *   Group shape: [color, title, links]
 *   Link shape:  [label, url, quality?, size?]
 *
 * HOW TO ADD:
 *   'TMDB_ID': ['Download Links', 'note', [
 *     ['red', 'Season 1', [['S01E01 1080p', 'https://url', '1080p', '1.2 GB']]],
 *   ]],
 *
 * quality and size are optional — just omit them: ['Label', 'https://url']
 */

export type ManualLinkColor =
  | 'red'
  | 'orange'
  | 'green'
  | 'blue'
  | 'purple'
  | 'yellow'
  | 'white'
  | 'cyan'

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

// ---- Compact (what you edit) ----
type CLink = [label: string, url: string, quality?: string, size?: string]
type CGroup = [color: ManualLinkColor, title: string, links: CLink[]]
type CRow = [mainTitle: string, note: string, groups: CGroup[]]

const RAW: Record<string, CRow> = {
  // Example series entry (replace with real TMDB TV IDs):
  // '1396': ['Download Links', 'Breaking Bad', [
  //   ['red', 'Season 1', [
  //     ['S01E01 1080p', 'https://example.com/bb-s01e01', '1080p', '1.2 GB'],
  //   ]],
  // ]],

  // TEST ENTRY — Stranger Things (TMDB TV ID: 66732)
  // Placeholder URLs are for UI/testing only; replace them with valid URLs you control.
  '66732': ['Stranger Things — Download Links', 'TEST DATA ONLY • Placeholder links for testing title, resolution, and file size display.', [
    ['red', 'Season 1', [
      ['S01E01 • Chapter One: The Vanishing of Will Byers • 1080p', 'https://example.com/stranger-things/s01e01-1080p.mkv', '1080p', '1.2 GB'],
      ['S01E01 • Chapter One: The Vanishing of Will Byers • 720p', 'https://example.com/stranger-things/s01e01-720p.mkv', '720p', '650 MB'],
      ['S01E02 • Chapter Two: The Weirdo on Maple Street • 1080p', 'https://example.com/stranger-things/s01e02-1080p.mkv', '1080p', '1.1 GB'],
    ]],
    ['blue', 'Season 2', [
      ['S02E01 • MADMAX • 1080p', 'https://example.com/stranger-things/s02e01-1080p.mkv', '1080p', '1.3 GB'],
      ['S02E01 • MADMAX • 720p', 'https://example.com/stranger-things/s02e01-720p.mkv', '720p', '700 MB'],
    ]],
    ['purple', 'Season 3', [
      ['S03E01 • Suzie, Do You Copy? • 1080p', 'https://example.com/stranger-things/s03e01-1080p.mkv', '1080p', '1.4 GB'],
    ]],
    ['green', 'Season 4', [
      ['S04E01 • The Hellfire Club • 1080p', 'https://example.com/stranger-things/s04e01-1080p.mkv', '1080p', '1.8 GB'],
      ['S04E01 • The Hellfire Club • 720p', 'https://example.com/stranger-things/s04e01-720p.mkv', '720p', '950 MB'],
    ]],
  ]],

  // Add more SERIES below:
}

// ---- Expand compact → full shape ----
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

export const MANUAL_SERIES_DOWNLOADS: Record<string, ManualDownloadEntry> = Object.fromEntries(
  Object.entries(RAW).map(([id, row]) => [id, expand(row)]),
)

/** Look up series manual downloads by TMDB ID. */
export function getManualSeriesDownloads(
  tmdbId: string | number | null | undefined,
): ManualDownloadEntry | null {
  if (tmdbId == null || tmdbId === '') return null
  return MANUAL_SERIES_DOWNLOADS[String(tmdbId)] ?? null
}
