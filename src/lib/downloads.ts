// Download sources for a title, resolved from public torrent indexes by IMDB id.
//
// Movies (Download 3 — Chillax YTS feature):
//   Pure YTS-style torrents from a working API mirror (movies-api.accel.li),
//   same approach as Chillax. Each entry has a direct .torrent file URL when
//   available, plus magnet fallback.
//
// TV:
//   EZTV (episode) + Torrentio (magnets).

import {
  buildMagnetUri,
  torrentFileUrl,
  torrentLabel,
  type YtsTorrent,
} from '@/src/lib/torrent-utils'

export type DownloadOption = {
  label: string
  quality?: string
  size?: string
  seeds?: number
  magnet: string
  /** Direct .torrent file URL (YTS). Prefer this — browser downloads the file. */
  url?: string
  /** 'YTS' | 'EZTV' | indexer name from Torrentio */
  source: string
}

const YTS_API_BASES = [
  'https://movies-api.accel.li/api/v2', // Chillax API — most reliable
  'https://yts.mx/api/v2',
  'https://yts.lt/api/v2',
  'https://yts.am/api/v2',
]

const EZTV_HOST = 'https://eztvx.to'
const TORRENTIO = 'https://torrentio.strem.fun'

const normalizeImdb = (imdbId: string) =>
  /^tt?\d+$/.test(imdbId) ? imdbId.replace(/^tt/, '') : null

function formatBytes(bytes: number): string {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

async function fetchJson(url: string, revalidate = 1800): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      next: { revalidate },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ---- Movies: pure Chillax / YTS feature -------------------------------------------------

/** Fetch YTS torrents for an IMDB id (first API base that answers). */
async function ytsMovies(id: string): Promise<DownloadOption[]> {
  for (const base of YTS_API_BASES) {
    const json = await fetchJson(
      `${base}/list_movies.json?query_term=tt${id}&limit=1`,
    )
    const movie = json?.data?.movies?.[0]
    if (!movie?.torrents?.length) continue

    const title = movie.title_long || movie.title || 'Movie'
    return (movie.torrents as YtsTorrent[]).map((torrent) => {
      const fileUrl = torrentFileUrl(torrent) || undefined
      const magnet =
        buildMagnetUri(torrent.hash, title) ||
        `magnet:?xt=urn:btih:${(torrent.hash || '').toUpperCase()}`
      return {
        label: torrentLabel(torrent),
        quality: torrent.quality,
        size: torrent.size || (torrent.size_bytes ? formatBytes(torrent.size_bytes) : ''),
        seeds: torrent.seeds,
        magnet,
        url: fileUrl,
        source: 'YTS',
      }
    })
  }
  return []
}

/** Movie downloads — Chillax YTS feature only (quality buttons + .torrent files). */
export async function getMovieDownloads(imdbId: string): Promise<DownloadOption[]> {
  const id = normalizeImdb(imdbId)
  if (!id) return []
  return ytsMovies(id)
}

// ---- TV: EZTV + Torrentio (magnets) -----------------------------------------------------

const PROVIDER_NAMES: Record<string, string> = {
  thepiratebay: 'The Pirate Bay',
  yts: 'YTS',
  eztv: 'EZTV',
  torrentgalaxy: 'TorrentGalaxy',
  rarbg: 'RARBG',
  magnetdl: 'MagnetDL',
  horriblesubs: 'HorribleSubs',
  nyaasi: 'Nyaa',
}

const providerFrom = (text: string) => {
  const raw = /⚙️?\s*([^\n]+)/.exec(text)?.[1]?.trim()
  return raw
    ? PROVIDER_NAMES[raw.toLowerCase().replace(/[^a-z0-9]/g, '')] ?? raw
    : 'Torrentio'
}

const sizeText = (text: string) => {
  const m = /(\d+(?:\.\d+)?\s*(?:GB|MB|TB|KB))/i.exec(text)
  return m?.[1]
}

const seedsFrom = (text: string) => {
  const m = /👤\s*(\d+)/.exec(text) || /seeds?\s*[:=]?\s*(\d+)/i.exec(text)
  return m ? Number(m[1]) : undefined
}

async function torrentio(
  type: 'movie' | 'series',
  id: string,
): Promise<DownloadOption[]> {
  const json = await fetchJson(
    `${TORRENTIO}/stream/${type}/${encodeURIComponent(id)}.json`,
  )
  const streams: any[] = Array.isArray(json?.streams) ? json.streams : []
  return streams
    .filter((s) => /^[0-9a-f]{40}$/i.test(s?.infoHash || ''))
    .map((s): DownloadOption => {
      const text = [s.name, s.title].filter((v) => typeof v === 'string').join('\n')
      const release = (typeof s.title === 'string' ? s.title : '').split('\n')[0].trim()
      const hash = String(s.infoHash).toLowerCase()
      return {
        label: release || String(s.name || '').replace(/\n/g, ' '),
        quality: /\b(2160p|4k|1080p|720p|480p)\b/i
          .exec(text)?.[1]
          ?.toLowerCase()
          .replace('4k', '2160p'),
        size: sizeText(text) ?? '',
        seeds: seedsFrom(text),
        magnet:
          buildMagnetUri(hash, release || 'download') ||
          `magnet:?xt=urn:btih:${hash.toUpperCase()}`,
        source: providerFrom(text),
      }
    })
}

const simplify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

function releaseMatches(release: string, names: string[]): boolean {
  const title = simplify(release)
  return names.some((name) => {
    const show = simplify(name)
    return show && (title === show || title.startsWith(`${show} `))
  })
}

async function eztvEpisodes(
  id: string,
  season: number,
  episode: number,
  names: string[],
): Promise<DownloadOption[]> {
  const json = await fetchJson(`${EZTV_HOST}/api/get-torrents?imdb_id=${id}&limit=100`)
  const torrents: any[] = json?.torrents ?? []
  return torrents
    .filter(
      (torrent) =>
        Number(torrent.season) === season &&
        Number(torrent.episode) === episode &&
        torrent.magnet_url,
    )
    .filter(
      (torrent) =>
        !names.length || releaseMatches(String(torrent.title || ''), names),
    )
    .map((torrent): DownloadOption => {
      const label =
        String(torrent.title || '')
          .replace(/\[eztv\]/i, '')
          .replace(/\s+EZTV$/i, '')
          .trim() || `S${season}E${episode}`
      return {
        label,
        quality: /\b(2160p|1080p|720p|480p)\b/i.exec(label)?.[1]?.toLowerCase(),
        size: formatBytes(Number(torrent.size_bytes)),
        seeds: torrent.seeds,
        magnet: torrent.magnet_url,
        source: 'EZTV',
      }
    })
}

const hashOf = (magnet: string) =>
  /btih:([0-9a-f]{40})/i.exec(magnet)?.[1]?.toLowerCase() ?? magnet

const QUALITY_ORDER = ['2160p', '1080p', '720p', '480p']
const qualityRank = (quality?: string) => {
  const index = quality ? QUALITY_ORDER.indexOf(quality) : -1
  return index === -1 ? QUALITY_ORDER.length : index
}

function merge(options: DownloadOption[]): DownloadOption[] {
  const seen = new Set<string>()
  return options
    .filter((option) => {
      const h = hashOf(option.magnet)
      if (seen.has(h)) return false
      seen.add(h)
      return true
    })
    .sort((a, b) => {
      const q = qualityRank(a.quality) - qualityRank(b.quality)
      if (q !== 0) return q
      return (b.seeds ?? 0) - (a.seeds ?? 0)
    })
}

/** Episode downloads from EZTV + Torrentio. */
export async function getTvDownloads(
  imdbId: string,
  season: number,
  episode: number,
  names: string[] = [],
): Promise<DownloadOption[]> {
  const id = normalizeImdb(imdbId)
  if (!id) return []
  const [eztv, more] = await Promise.all([
    eztvEpisodes(id, season, episode, names),
    torrentio('series', `tt${id}:${season}:${episode}`),
  ])
  return merge([...eztv, ...more])
}
