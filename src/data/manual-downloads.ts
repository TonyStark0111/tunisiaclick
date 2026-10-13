/**
 * Compact manual download links keyed by TMDB ID (movie or TV).
 *
 * Row shape:   [mainTitle, note, groups]
 * Group shape: [color, title, links]
 * Link shape:  [label, url, quality?, size?]
 *
 * Example:
 *   '1291595': ['Download Links', 'note', [
 *     ['red', 'Sub 1', [['1080p', 'url', '1080p', '2.1 GB']]],
 *   ]],
 */

export type ManualLinkColor =
  | 'red' | 'orange' | 'green' | 'blue'
  | 'purple' | 'yellow' | 'white' | 'cyan'

export type ManualLink  = { label: string; url: string; quality?: string; size?: string }
export type ManualGroup = { title: string; color: ManualLinkColor; links: ManualLink[] }
export type ManualDownloadEntry = { mainTitle: string; note?: string; groups: ManualGroup[] }

// ---- Compact (what you edit) ----
type CLink  = [label: string, url: string, quality?: string, size?: string]
type CGroup = [color: ManualLinkColor, title: string, links: CLink[]]
type CRow   = [mainTitle: string, note: string, groups: CGroup[]]

const RAW: Record<string, CRow> = {
  // TMDB 1291595 — one line per group, one line per link
  '1291595': ['Download Links', 'Official / direct links for this title', [
    ['red',    'Sub Main title 1', [['1080p BluRay', 'https://example.com/download/1291595-1080p', '1080p', '2.1 GB'], ['720p WEB-DL', 'https://example.com/download/1291595-720p', '720p', '1.2 GB']]],
    ['orange', 'Sub Main title 2', [['4K HDR', 'https://example.com/download/1291595-4k', '2160p', '8.5 GB']]],
    ['green',  'Sub Main title 3', [['Audio / Soundtrack', 'https://example.com/download/1291595-audio', 'FLAC', '450 MB']]],
  ]],

  // TMDB 969681
  '969681': ['Download Links', 'Official / direct links for this title', [
    ['green', 'Encoded Version', [
      ['Spider.Man.Brand.New.Day.2026.720p.10bit.Multi.Audio.Hindi.English.Kannada.Malayalam.Tamil.Telugu.WEB-DL', 'https://gofile.io/d/amINuWCr', '720p IMAX 10BIT', '1.2 GB'],
      ['Spider-Man:Brand New Day 2026 1080p 10bit Multi', 'https://z1.kmphotos.cv/download99.php?file=Spider.Man.Brand.New.Day.2026.1080p.10bit.Multi.Audio.Hindi.English.Kannada.Malayalam.Tamil.Telugu.WEB-DL.KMMOVIES.COM.mkv&dl=r2&exp=1791873812&sig=e67021fdce0fa86ea65d6f73816e283591777d626d4afc738269c74516caed58', '1080p IMAX 10BIT', '3.8 GB'],
    ]],
    ['green', 'Sub main title 2', [['4K HDR', 'https://example.com/download/969681-4k', '2160p', '8.5 GB']]],
    ['green', 'Sub main title 3', [['Audio / Soundtrack', 'https://example.com/download/969681-audio', 'FLAC', '450 MB']]],
  ]],

  // TMDB 1148365
  '969681': ['Download Links', 'Official / direct links for this title', [
    ['green', 'Encoded Version', [
      ['Spider.Man.Brand.New.Day.2026.720p.10bit.Multi.Audio.Hindi.English.Kannada.Malayalam.Tamil.Telugu.WEB-DL', 'https://gofile.io/d/amINuWCr', '720p IMAX 10BIT', '1.2 GB'],
      ['Spider-Man:Brand New Day 2026 1080p 10bit Multi', 'https://z1.kmphotos.cv/download99.php?file=Spider.Man.Brand.New.Day.2026.1080p.10bit.Multi.Audio.Hindi.English.Kannada.Malayalam.Tamil.Telugu.WEB-DL.KMMOVIES.COM.mkv&dl=r2&exp=1791873812&sig=e67021fdce0fa86ea65d6f73816e283591777d626d4afc738269c74516caed58', '1080p IMAX 10BIT', '3.8 GB'],
    ]],
    ['green', 'Sub main title 2', [['4K HDR', 'https://example.com/download/969681-4k', '2160p', '8.5 GB']]],
    ['green', 'Sub main title 3', [['Audio / Soundtrack', 'https://example.com/download/969681-audio', 'FLAC', '450 MB']]],
  ]],

  // TMDB 1148365 — even the whole entry on one line if you want
  '1148365': ['Download Links', 'Official / direct links for this title', [['red', 'Sub Main title 1', [['1080p BluRay', 'https://example.com/download/1148365-1080p', '1080p', '2.1 GB'], ['720p WEB-DL', 'https://example.com/download/1148365-720p', '720p', '1.2 GB']]], ['orange', 'Sub Main title 2', [['4K HDR', 'https://example.com/download/1148365-4k', '2160p', '8.5 GB']]], ['green', 'Sub Main title 3', [['Audio / Soundtrack', 'https://example.com/download/1148365-audio', 'FLAC', '450 MB']]]]],
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
      links: links.map(([label, url, quality, size]) => ({ label, url, quality, size })),
    })),
  }
}

export const MANUAL_DOWNLOADS: Record<string, ManualDownloadEntry> =
  Object.fromEntries(Object.entries(RAW).map(([id, row]) => [id, expand(row)]))

/** Look up by TMDB ID (number or string). Returns null when none. */
export function getManualDownloads(
  tmdbId: string | number | null | undefined
): ManualDownloadEntry | null {
  if (tmdbId == null || tmdbId === '') return null
  return MANUAL_DOWNLOADS[String(tmdbId)] ?? null
}
