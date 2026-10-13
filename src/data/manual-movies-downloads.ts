/**
 * MANUAL MOVIE DOWNLOAD LINKS
 * Keyed by TMDB movie ID only.
 *
 * COMPACT FORMAT (easy to edit):
 *   Row shape:   [mainTitle, note, groups]
 *   Group shape: [color, title, links]
 *   Link shape:  [label, url, quality?, size?]
 *
 * HOW TO ADD:
 *   'TMDB_ID': ['Download Links', 'note', [
 *     ['red', 'Sub title', [['Label', 'https://url', '1080p', '2.1 GB']]],
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
  // ── TMDB 1291595 ─────────────────────────────────────────────
  '1291595': [
    'Download Links',
    'Official / direct links for this title',
    [
      [
        'red',
        'Sub Main title 1',
        [
          ['1080p BluRay', 'https://example.com/download/1291595-1080p', '1080p', '2.1 GB'],
          ['720p WEB-DL', 'https://example.com/download/1291595-720p', '720p', '1.2 GB'],
        ],
      ],
      [
        'orange',
        'Sub Main title 2',
        [['4K HDR', 'https://example.com/download/1291595-4k', '2160p', '8.5 GB']],
      ],
    ],
  ],

  // ── TMDB 969681 ──────────────────────────────────────────────
  '969681': [
    'Download Links',
    'Official / direct links for this title',
    [
      [
        'green',
        'Encoded Version',
        [
          [
            'Spider.Man.Brand.New.Day.2026.720p.10bit.Multi.Audio.Hindi.English.Kannada.Malayalam.Tamil.Telugu.WEB-DL',
            'https://gofile.io/d/amINuWCr',
            '720p IMAX 10BIT',
            '1.2 GB',
          ],
          [
            'Spider-Man:Brand New Day 2026 1080p 10bit Multi',
            'https://z1.kmphotos.cv/download99.php?file=Spider.Man.Brand.New.Day.2026.1080p.10bit.Multi.Audio.Hindi.English.Kannada.Malayalam.Tamil.Telugu.WEB-DL.KMMOVIES.COM.mkv&dl=r2&exp=1791873812&sig=e67021fdce0fa86ea65d6f73816e283591777d626d4afc738269c74516caed58',
            '1080p IMAX 10BIT',
            '3.8 GB',
          ],
        ],
      ],
      [
        'green',
        'Sub main title 2',
        [['4K HDR', 'https://example.com/download/969681-4k', '2160p', '8.5 GB']],
      ],
    ],
  ],

  // ── TMDB 1148365 ─────────────────────────────────────────────
  '1148365': [
    'Download Links',
    'Official / direct links for this title',
    [
      [
        'red',
        'Sub Main title 1',
        [
          ['1080p BluRay', 'https://example.com/download/1148365-1080p', '1080p', '2.1 GB'],
          ['720p WEB-DL', 'https://example.com/download/1148365-720p', '720p', '1.2 GB'],
        ],
      ],
      [
        'orange',
        'Sub Main title 2',
        [['4K HDR', 'https://example.com/download/1148365-4k', '2160p', '8.5 GB']],
      ],
    ],
  ],

  // Add more MOVIES below:
  // '550': ['Download Links', 'Fight Club', [
  //   ['red', 'BluRay', [['1080p', 'https://…', '1080p', '2.1 GB']]],
  // ]],
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

export const MANUAL_MOVIES_DOWNLOADS: Record<string, ManualDownloadEntry> = Object.fromEntries(
  Object.entries(RAW).map(([id, row]) => [id, expand(row)]),
)

/** Look up movie manual downloads by TMDB ID. */
export function getManualMovieDownloads(
  tmdbId: string | number | null | undefined,
): ManualDownloadEntry | null {
  if (tmdbId == null || tmdbId === '') return null
  return MANUAL_MOVIES_DOWNLOADS[String(tmdbId)] ?? null
}
