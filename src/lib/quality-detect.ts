/**
 * TunisiaClick Multi-Source Quality Detection Engine
 *
 * Automatically detects video quality/resolution from:
 * 1. Filename patterns (2160, 4K, 1080, 720, 480, UHD, FHD, HD, SD …)
 * 2. URL path / query segments
 * 3. Known host / resolver metadata (extensible)
 * 4. Manual override (highest priority)
 *
 * Used by the Manual Stream system so admins can paste raw URLs
 * (one per line) and have them auto-organized into a unified
 * quality-selection UI (2160p · 1440p · 1080p · 720p · 480p …).
 */

export type DetectedQuality =
  | '2160p'
  | '1440p'
  | '1080p'
  | '720p'
  | '480p'
  | '360p'
  | '240p'
  | 'unknown'

/** Canonical order from highest to lowest (used for sorting the source bar). */
export const QUALITY_ORDER: DetectedQuality[] = [
  '2160p',
  '1440p',
  '1080p',
  '720p',
  '480p',
  '360p',
  '240p',
  'unknown',
]

/** Human-friendly labels shown in the player source switcher. */
export const QUALITY_LABELS: Record<DetectedQuality, string> = {
  '2160p': '4K / 2160p',
  '1440p': '1440p',
  '1080p': '1080p',
  '720p': '720p',
  '480p': '480p',
  '360p': '360p',
  '240p': '240p',
  unknown: 'Source',
}

/** Numeric height for sorting / comparison. */
const HEIGHT: Record<DetectedQuality, number> = {
  '2160p': 2160,
  '1440p': 1440,
  '1080p': 1080,
  '720p': 720,
  '480p': 480,
  '360p': 360,
  '240p': 240,
  unknown: 0,
}

/**
 * Filename / path patterns → quality.
 * Order matters: first match wins (more specific first).
 */
const PATTERNS: Array<{ re: RegExp; q: DetectedQuality }> = [
  // Explicit 4K / UHD / 2160
  { re: /\b(2160p?|4k|uhd|ultra[\s._-]?hd)\b/i, q: '2160p' },
  // 1440p / QHD
  { re: /\b(1440p?|qhd|2k)\b/i, q: '1440p' },
  // 1080p / FHD / Full HD
  { re: /\b(1080p?|fhd|full[\s._-]?hd)\b/i, q: '1080p' },
  // 720p / HD
  { re: /\b(720p?|hd(?!r))\b/i, q: '720p' },
  // 480p / SD
  { re: /\b(480p?|sd)\b/i, q: '480p' },
  // Lower
  { re: /\b(360p?)\b/i, q: '360p' },
  { re: /\b(240p?)\b/i, q: '240p' },
]

/**
 * Detect quality from a single URL or filename string.
 * Returns 'unknown' when nothing matches.
 */
export function detectQualityFromString(input: string): DetectedQuality {
  if (!input || typeof input !== 'string') return 'unknown'

  // Prefer the last path segment / filename
  let candidate = input
  try {
    const u = new URL(input)
    const path = u.pathname || ''
    const last = path.split('/').filter(Boolean).pop() || path
    candidate = last + ' ' + (u.search || '') + ' ' + input
  } catch {
    // not a full URL – treat whole string as candidate
  }

  for (const { re, q } of PATTERNS) {
    if (re.test(candidate)) return q
  }
  return 'unknown'
}

/**
 * Normalize a free-form quality string (from admin override or host)
 * into one of our DetectedQuality values.
 */
export function normalizeQuality(raw?: string | null): DetectedQuality {
  if (!raw) return 'unknown'
  const s = String(raw).trim().toLowerCase()
  if (/2160|4k|uhd/.test(s)) return '2160p'
  if (/1440|qhd|2k/.test(s)) return '1440p'
  if (/1080|fhd|full/.test(s)) return '1080p'
  if (/720|hd/.test(s)) return '720p'
  if (/480|sd/.test(s)) return '480p'
  if (/360/.test(s)) return '360p'
  if (/240/.test(s)) return '240p'
  // already canonical?
  if (QUALITY_ORDER.includes(s as DetectedQuality)) return s as DetectedQuality
  return 'unknown'
}

/**
 * Compare two qualities for sorting (highest first).
 */
export function compareQuality(a: DetectedQuality | string, b: DetectedQuality | string): number {
  const ha = HEIGHT[normalizeQuality(a)] ?? 0
  const hb = HEIGHT[normalizeQuality(b)] ?? 0
  return hb - ha
}

/**
 * Build a nice display label for a source.
 * Prefer explicit label → quality label → host name → "Source".
 */
export function buildSourceLabel(opts: {
  label?: string
  quality?: string
  url: string
  note?: string
}): string {
  if (opts.label && opts.label.trim()) {
    return opts.note ? `${opts.label} · ${opts.note}` : opts.label
  }
  const q = normalizeQuality(opts.quality)
  const qLabel = q !== 'unknown' ? QUALITY_LABELS[q] : null
  if (qLabel) {
    return opts.note ? `${qLabel} · ${opts.note}` : qLabel
  }
  // Fallback: host
  try {
    const host = new URL(opts.url).hostname.replace(/^www\./, '')
    return opts.note ? `${host} · ${opts.note}` : host
  } catch {
    return opts.note || 'Source'
  }
}

/**
 * Parse a multi-line paste of URLs (one URL per line).
 * Empty lines and comments (# …) are ignored.
 * Returns an array of raw URL strings.
 */
export function parseMultiUrlPaste(text: string): string[] {
  if (!text) return []
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && /^https?:\/\//i.test(line))
}

/**
 * Turn a list of raw URLs into ManualStream-like objects with
 * auto-detected quality and generated labels.
 *
 * Admin can still override quality / label later.
 */
export function autoMapSources(
  urls: string[],
  overrides?: Array<{ url: string; quality?: string; label?: string; note?: string }>,
): Array<{
  url: string
  label: string
  quality: DetectedQuality
  note?: string
}> {
  const overrideMap = new Map(
    (overrides || []).map((o) => [o.url.trim(), o]),
  )

  return urls.map((rawUrl, index) => {
    const url = rawUrl.trim()
    const ov = overrideMap.get(url)
    const detected = detectQualityFromString(url)
    const quality = ov?.quality ? normalizeQuality(ov.quality) : detected
    const label =
      ov?.label ||
      (quality !== 'unknown' ? QUALITY_LABELS[quality] : `Source ${index + 1}`)
    return {
      url,
      label,
      quality,
      note: ov?.note,
    }
  })
}
