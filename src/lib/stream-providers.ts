// Third-party embed / download providers, keyed by TMDB id. Server only.
//
// This is the single place sources come from: every movie and TV page reads its templates from
// here (getProviderTemplates) and hands them to the player, which fills in the title and episode
// (fillProviders in lib/media-assets). Each provider builds its own URL for a movie or a TV episode
// (providers disagree on how the season/episode is passed: some use a path, some a query string).
//
// These are external services the app does not control; any of them can change or go down, which
// is why the player lets the viewer switch between several, and why the list can change without
// touching the code (Vercel → Settings → Environment Variables, then redeploy):
//
// - STREAM_PROVIDERS: the whole list, as JSON, best first. `{id}`, `{season}` and `{episode}`
//   are filled in:
//   [{"name":"Vidy","movie":"https://www.vidy.st/movie/{id}","tv":"https://www.vidy.st/tv/{id}/{season}/{episode}"}]
// - STREAM_PROVIDERS_OFF: names to switch off, comma-separated (e.g. "2Embed,AutoEmbed").
//
// Both are read on the server only (a client bundle never sees them, which is why the pages pass
// the templates down as props instead of the player importing this file).
//
// The order also fixes itself: sources viewers report as broken move to the end of the player's
// list (lib/stream-health).
import 'server-only'

export type MediaType = 'movie' | 'tv'

export type StreamProvider = { name: string; url: string }

/** A provider as URL templates: `{id}` (and for TV `{season}`, `{episode}`) get filled in. */
export type ProviderTemplate = { name: string; movie: string; tv: string }

// Ordered best-first; the first one is selected by default.
//
// The set was probed for reachability + a real player payload (2026). These are client-rendered,
// region-gated players, so availability varies by the viewer's network — hence several sources to
// switch between. If one stops working, drop it here; the UI updates everywhere.
const BUILT_IN: ProviderTemplate[] = [
  { name: 'Vidy', movie: 'https://www.vidy.st/movie/{id}?color=DC2626', tv: 'https://www.vidy.st/tv/{id}/{season}/{episode}?color=DC2626&nextEpisode=true&episodeSelector=true' },
  { name: 'Filmu', movie: 'https://embed.filmu.in/movie/{id}', tv: 'https://embed.filmu.in/tv/{id}/{season}/{episode}' },
  { name: 'VidZee', movie: 'https://player.vidzee.wtf/embed/movie/{id}', tv: 'https://player.vidzee.wtf/embed/tv/{id}/{season}/{episode}' },
  { name: 'PrimeSRC', movie: 'https://primesrc.me/embed/movie?tmdb={id}', tv: 'https://primesrc.me/embed/tv?tmdb={id}&season={season}&episode={episode}' },
  { name: 'Vidrift', movie: 'https://vidnest.fun/movie/{id}', tv: 'https://vidnest.fun/tv/{id}/{season}/{episode}' },
  { name: 'VidNest', movie: 'https://embed.vidrift.in/embed/movie/{id}?brand=Meowly', tv: 'https://embed.vidrift.in/embed/tv/{id}/{season}/{episode}?brand=Meowly' },
  { name: 'Vidfast', movie: 'https://vidfast.net/movie/{id}', tv: 'https://vidfast.net/tv/{id}/{season}/{episode}' },
  { name: 'VidSrc PM', movie: 'https://vidsrc.pm/embed/movie/{id}', tv: 'https://vidsrc.pm/embed/tv/{id}/{season}/{episode}' },
  { name: 'VidSrc SU', movie: 'https://vidsrcme.su/embed/movie?tmdb={id}', tv: 'https://vidsrcme.su/embed/tv?tmdb={id}&season={season}&episode={episode}' },
  { name: '2Embed', movie: 'https://www.2embed.skin/embed/{id}', tv: 'https://www.2embed.skin/embedtv/{id}&s={season}&e={episode}' },
  { name: 'AutoEmbed', movie: 'https://autoembed.co/movie/tmdb/{id}', tv: 'https://autoembed.co/tv/tmdb/{id}-{season}-{episode}' },
  { name: 'Vidrock', movie: 'https://vidrock.net/embed/movie/{id}', tv: 'https://vidrock.net/embed/tv/{id}/{season}/{episode}' },
]

type Template = { name?: unknown, movie?: unknown, tv?: unknown }

/** STREAM_PROVIDERS, if it's set and valid; otherwise null (and the built-in list is used). */
function fromEnv(raw: string | undefined): ProviderTemplate[] | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('not an array')
    const list = (parsed as Template[]).flatMap((item): ProviderTemplate[] => {
      const { name, movie, tv } = item ?? {}
      const valid = typeof name === 'string' && name.trim() && typeof movie === 'string' && typeof tv === 'string'
        && movie.startsWith('https://') && tv.startsWith('https://') && movie.includes('{id}') && tv.includes('{id}')
      if (!valid) {
        console.error('STREAM_PROVIDERS: skipped an entry without a name and https movie/tv templates containing {id}:', item)
        return []
      }
      return [{ name: name.trim(), movie, tv }]
    })
    return list.length ? list : null
  } catch (error) {
    console.error('STREAM_PROVIDERS is not valid JSON; using the built-in sources:', error)
    return null
  }
}

let memo: { key: string, list: ProviderTemplate[] } | null = null

/**
 * The stream sources as templates, best first: STREAM_PROVIDERS (or the built-in list) without
 * the names in STREAM_PROVIDERS_OFF. Read from the environment on every call (memoised while it
 * doesn't change), so a test or a redeploy with new values takes effect.
 */
export function getProviderTemplates(): ProviderTemplate[] {
  const raw = process.env.STREAM_PROVIDERS ?? ''
  const offRaw = process.env.STREAM_PROVIDERS_OFF ?? ''
  const key = `${raw}\n${offRaw}`
  if (memo?.key === key) return memo.list
  const off = new Set(offRaw.split(',').map((name) => name.trim().toLowerCase()).filter(Boolean))
  const list = (fromEnv(raw) ?? BUILT_IN).filter((provider) => !off.has(provider.name.toLowerCase()))
  memo = { key, list }
  return list
}

/** Names of all providers (for validating health reports). */
export function providerNames(): readonly string[] {
  return getProviderTemplates().map((provider) => provider.name)
}

/** Names of all providers, as configured when the server started (kept for older callers). */
export const PROVIDER_NAMES: readonly string[] = providerNames()
