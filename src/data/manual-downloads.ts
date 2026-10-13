/**
 * Manual / custom download links keyed by TMDB ID (movie or TV).
 *
 * HOW TO ADD LINKS:
 * 1. Find the TMDB ID of the movie/TV show (from the URL or detail page).
 * 2. Add an entry under that ID.
 * 3. Structure:
 *    - mainTitle: the big white heading (e.g. "Download Links")
 *    - groups: array of colored sub-sections
 *      - title: sub main title (colored)
 *      - color: 'red' | 'orange' | 'green' | 'blue' | 'purple' | 'yellow' | 'white'
 *      - links: array of { label, url, quality?, size? }
 *
 * Example for TMDB 1291595 is included below. Paste more entries as needed.
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
  /** Sub main title shown in the chosen color */
  title: string
  color: ManualLinkColor
  links: ManualLink[]
}

export type ManualDownloadEntry = {
  /** Main Title – rendered large in white */
  mainTitle: string
  /** Optional note under the main title */
  note?: string
  groups: ManualGroup[]
}

/**
 * Map of TMDB ID (string or number) → manual download entry.
 * Add new movies/TV here. Keys are always strings internally.
 */
export const MANUAL_DOWNLOADS: Record<string, ManualDownloadEntry> = {
  // Example: TMDB ID 1291595
  '1291595': {
    mainTitle: 'Download Links',
    note: 'Official / direct links for this title',
    groups: [
      {
        title: 'Sub Main title 1',
        color: 'red',
        links: [
          {
            label: '1080p BluRay',
            url: 'https://example.com/download/1291595-1080p',
            quality: '1080p',
            size: '2.1 GB',
          },
          {
            label: '720p WEB-DL',
            url: 'https://example.com/download/1291595-720p',
            quality: '720p',
            size: '1.2 GB',
          },
        ],
      },
      {
        title: 'Sub main title 2',
        color: 'orange',
        links: [
          {
            label: '4K HDR',
            url: 'https://example.com/download/1291595-4k',
            quality: '2160p',
            size: '8.5 GB',
          },
        ],
      },
      {
        title: 'Sub main title 3',
        color: 'green',
        links: [
          {
            label: 'Audio / Soundtrack',
            url: 'https://example.com/download/1291595-audio',
            quality: 'FLAC',
            size: '450 MB',
          },
        ],
      },
    ],
  },

  // TMDB ID 969681
  '969681': {
    mainTitle: 'Download Links',
    note: 'Official / direct links for this title',
    groups: [
      {
        title: 'Encoded Version',
        color: 'red',
        links: [
          {
            label: 'Spider.Man.Brand.New.Day.2026.720p.10bit.Multi.Audio.Hindi.English.Kannada.Malayalam.Tamil.Telugu.WEB-DL',
            url: 'https://gofile.io/d/amINuWCr',
            quality: '720p IMAX 10BIT',
            size: '1.2 GB',
          },
          {
            label: 'Spider.Man.Brand.New.Day.2026.1080p.10bit.Multi.Audio.Hindi.English.Kannada.Malayalam.Tamil.Telugu.WEB',
            url: 'https://z1.kmphotos.cv/download99.php?file=Spider.Man.Brand.New.Day.2026.1080p.10bit.Multi.Audio.Hindi.English.Kannada.Malayalam.Tamil.Telugu.WEB-DL.KMMOVIES.COM.mkv&dl=r2&exp=1791873812&sig=e67021fdce0fa86ea65d6f73816e283591777d626d4afc738269c74516caed58',
            quality: '1080p IMAX 10BIT',
            size: '3.8 GB',
          },
        ],
      },
      {
        title: 'Sub main title 2',
        color: 'green',
        links: [
          {
            label: '4K HDR',
            url: 'https://example.com/download/969681-4k',
            quality: '2160p',
            size: '8.5 GB',
          },
        ],
      },
      {
        title: 'Sub main title 3',
        color: 'green',
        links: [
          {
            label: 'Audio / Soundtrack',
            url: 'https://example.com/download/969681-audio',
            quality: 'FLAC',
            size: '450 MB',
          },
        ],
      },
    ],
  },

  // TMDB ID 1148365
  '1148365': {
    mainTitle: 'Download Links',
    note: 'Official / direct links for this title',
    groups: [
      {
        title: 'Sub Main title 1',
        color: 'red',
        links: [
          {
            label: '1080p BluRay',
            url: 'https://example.com/download/1148365-1080p',
            quality: '1080p',
            size: '2.1 GB',
          },
          {
            label: '720p WEB-DL',
            url: 'https://example.com/download/1148365-720p',
            quality: '720p',
            size: '1.2 GB',
          },
        ],
      },
      {
        title: 'Sub main title 2',
        color: 'orange',
        links: [
          {
            label: '4K HDR',
            url: 'https://example.com/download/1148365-4k',
            quality: '2160p',
            size: '8.5 GB',
          },
        ],
      },
      {
        title: 'Sub main title 3',
        color: 'green',
        links: [
          {
            label: 'Audio / Soundtrack',
            url: 'https://example.com/download/1148365-audio',
            quality: 'FLAC',
            size: '450 MB',
          },
        ],
      },
    ],
  },

  // Add more entries below, for example:
  // '550': { ... }  // Fight Club
}

/** Helper to look up by TMDB ID (number or string). Returns null when none. */
export function getManualDownloads(
  tmdbId: string | number | null | undefined
): ManualDownloadEntry | null {
  if (tmdbId == null || tmdbId === '') return null
  return MANUAL_DOWNLOADS[String(tmdbId)] ?? null
}
