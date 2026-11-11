/**
 * Chillax-style YTS torrent helpers (imported into Tunisiaclick Download 3).
 * Used to label qualities, build magnets, and pick .torrent file URLs.
 */

export const DEFAULT_TRACKERS = [
  'udp://open.demonii.com:1337/announce',
  'udp://tracker.openbittorrent.com:80',
  'udp://tracker.coppersurfer.tk:6969',
  'udp://glotorrents.pw:6969/announce',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://torrent.gresille.org:80/announce',
  'udp://p4p.arenabg.ch:1337',
  'udp://tracker.internetwarriors.net:1337',
] as const

/** Minimal torrent shape (YTS / Chillax compatible). */
export type YtsTorrent = {
  url?: string
  hash: string
  quality?: string
  type?: string
  video_codec?: string
  seeds?: number
  peers?: number
  size?: string
  size_bytes?: number
}

export function isValidTorrentHash(hash: string | undefined | null): boolean {
  if (!hash || typeof hash !== 'string') return false
  const clean = hash.trim()
  return /^[a-fA-F0-9]{40}$/.test(clean) || /^[2-7a-zA-Z]{32}$/.test(clean)
}

export function normalizeTorrentHash(hash: string): string {
  return hash.trim().toUpperCase()
}

/** Build magnet URI with public trackers (fallback when no .torrent file URL). */
export function buildMagnetUri(
  hash: string,
  movieTitle: string,
  extraTrackers?: string[],
): string | null {
  if (!isValidTorrentHash(hash)) return null
  const cleanHash = normalizeTorrentHash(hash)
  const cleanTitle = movieTitle.trim() || 'Movie'
  const trackers = extraTrackers?.length ? extraTrackers : [...DEFAULT_TRACKERS]
  const trackerParams = trackers.map((tr) => `&tr=${encodeURIComponent(tr)}`).join('')
  return `magnet:?xt=urn:btih:${cleanHash}&dn=${encodeURIComponent(cleanTitle)}${trackerParams}`
}

const TYPE_LABELS: Record<string, string> = { bluray: 'BLU', web: 'WEB' }

/** YTS / Chillax button label: "1080p.WEB", "720p.BLU", "2160p.BLU x265". */
export function torrentLabel(
  torrent: Pick<YtsTorrent, 'quality' | 'type' | 'video_codec'>,
): string {
  const type = (torrent.type || '').trim().toLowerCase()
  const base = type
    ? `${torrent.quality || ''}.${TYPE_LABELS[type] ?? type.toUpperCase()}`
    : torrent.quality || 'Unknown'
  return /x265|hevc/i.test(torrent.video_codec || '') ? `${base} x265` : base
}

/** Prefer https .torrent file URL so the browser downloads the file. */
export function torrentFileUrl(torrent: Pick<YtsTorrent, 'url'>): string | null {
  const url = (torrent.url || '').trim()
  if (!/^https?:\/\//i.test(url)) return null
  return url.replace(/^http:\/\//i, 'https://')
}
