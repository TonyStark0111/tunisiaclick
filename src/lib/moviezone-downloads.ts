/**
 * Moviezone / Olly Embed download servers roster.
 * {id} = TMDB id, {s}/{e} = season / episode.
 * Same four servers, order and badges as ollyembed.pages.dev /api/download-servers.
 */
export type MoviezoneServer = {
  tag: string
  name: string
  note: string
  chips: string[]
  flag?: string
  /** Tailwind-ish gradient ends for the badge */
  gradientFrom: string
  gradientTo: string
  movie: string
  tv: string
}

export const MOVIEZONE_SERVERS: MoviezoneServer[] = [
  {
    tag: 'D1',
    name: '02Downloader',
    note: 'Searches every source it knows — can take up to a minute',
    chips: ['Many sources', 'Human check'],
    gradientFrom: '#a855f7',
    gradientTo: '#6366f1',
    movie: 'https://02moviedownloader.site/api/download/movie/{id}',
    tv: 'https://02moviedownloader.site/api/download/tv/{id}/{s}/{e}',
  },
  {
    tag: 'D2',
    name: 'NxSha',
    note: 'HubCloud, Pixeldrain and HubDrive mirrors',
    chips: ['480p–4K', 'Hindi + English'],
    flag: 'Best quality',
    gradientFrom: '#f97316',
    gradientTo: '#e11d48',
    movie: 'https://nxsha.space/dl/movie/{id}',
    tv: 'https://nxsha.space/dl/tv/{id}/{s}/{e}',
  },
  {
    tag: 'D3',
    name: 'VidSync',
    note: 'Backup mirror — for when the others are busy',
    chips: ['Backup'],
    gradientFrom: '#22c55e',
    gradientTo: '#059669',
    movie: 'https://vidsync.pro/embed/download/movie/{id}',
    tv: 'https://vidsync.pro/embed/download/tv/{id}/{s}/{e}',
  },
  {
    tag: 'D4',
    name: 'VidVault',
    note: 'Direct file — the download starts straight away',
    chips: ['360p–1080p', 'File sizes shown'],
    flag: 'Fastest',
    gradientFrom: '#0ea5e9',
    gradientTo: '#2563eb',
    movie: 'https://vidvault.to/movie/{id}',
    tv: 'https://vidvault.to/tv/{id}/{s}/{e}',
  },
]

export function moviezoneLink(
  server: MoviezoneServer,
  opts: { kind: 'movie' | 'tv'; tmdbId: string | number; season?: number; episode?: number },
): string {
  const tpl = opts.kind === 'tv' ? server.tv : server.movie
  return tpl
    .replace('{id}', encodeURIComponent(String(opts.tmdbId)))
    .replace('{s}', String(opts.season ?? 1))
    .replace('{e}', String(opts.episode ?? 1))
}
