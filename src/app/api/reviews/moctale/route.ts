// Moctale reviews-summary proxy (same approach as meowly getMoctaleReviewsAction).
// Uses got-scraping when installed to clear Cloudflare; plain fetch is blocked with 403.
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function authCookie(): string {
  // Preferred: MOCTALE_REVIEWS_COOKIE_TOKEN (raw token or full cookie string).
  // Legacy MOCTALE_COOKIE still accepted.
  const cookie =
    process.env.MOCTALE_REVIEWS_COOKIE_TOKEN
    || process.env.MOCTALE_COOKIE
    || ''
  if (!cookie) return ''
  if (cookie.includes('auth_token=')) {
    const match = cookie.match(/auth_token=([^;]+)/)
    return match ? `auth_token=${match[1]}` : cookie
  }
  // Bare token value → send as auth_token cookie
  if (!cookie.includes('=')) return `auth_token=${cookie}`
  return cookie
}

function moctaleHeaders(slug: string, cookie: string): Record<string, string> {
  const headers: Record<string, string> = {
    accept: '*/*',
    'accept-language': 'en-US,en;q=0.9,hi;q=0.8',
    'cache-control': 'no-cache',
    dnt: '1',
    pragma: 'no-cache',
    priority: 'u=1, i',
    referer: `https://www.moctale.in/content/${slug}`,
    'sec-ch-ua-mobile': '?0',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  }
  if (cookie) headers.cookie = cookie
  return headers
}

/** Flatten common Moctale payload shapes into the fields ReviewsSection expects. */
function normalizeMoctalePayload(raw: any): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  // Some responses wrap the summary under data / result / payload
  const body = raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
    ? (raw.percent_perfect_reviews != null || raw.percentPerfectReviews != null || raw.total_reviews != null
        ? raw
        : raw.data)
    : raw

  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = body?.[key]
      if (value !== undefined && value !== null) return value
    }
    return undefined
  }

  const total = pick('total_reviews', 'totalReviews', 'reviewsCount', 'total')
  const pctPerfect = pick('percent_perfect_reviews', 'percentPerfectReviews', 'pct_perfect')
  const pctPositive = pick('percent_positive_reviews', 'percentPositiveReviews', 'pct_positive')
  const pctNeutral = pick('percent_neutral_reviews', 'percentNeutralReviews', 'pct_neutral')
  const pctNegative = pick('percent_negative_reviews', 'percentNegativeReviews', 'pct_negative')

  // If only absolute counts exist, derive percentages
  const perfect = Number(pick('perfect_reviews', 'perfectReviews') ?? 0)
  const positive = Number(pick('positive_reviews', 'positiveReviews') ?? 0)
  const neutral = Number(pick('neutral_reviews', 'neutralReviews') ?? 0)
  const negative = Number(pick('negative_reviews', 'negativeReviews') ?? 0)
  const count = Number(total ?? perfect + positive + neutral + negative)

  const toPct = (n: number) => (count > 0 ? Math.round((n / count) * 1000) / 10 : 0)

  return {
    ...body,
    summary: pick('summary', 'aiSummary', 'consensus'),
    aiSummary: pick('aiSummary', 'summary'),
    total_reviews: count || total,
    totalReviews: count || total,
    perfect_reviews: perfect || pick('perfect_reviews', 'perfectReviews'),
    positive_reviews: positive || pick('positive_reviews', 'positiveReviews'),
    neutral_reviews: neutral || pick('neutral_reviews', 'neutralReviews'),
    negative_reviews: negative || pick('negative_reviews', 'negativeReviews'),
    percent_perfect_reviews: pctPerfect ?? (count ? toPct(perfect) : undefined),
    percent_positive_reviews: pctPositive ?? (count ? toPct(positive) : undefined),
    percent_neutral_reviews: pctNeutral ?? (count ? toPct(neutral) : undefined),
    percent_negative_reviews: pctNegative ?? (count ? toPct(negative) : undefined),
    keyTakeaways: pick('keyTakeaways', 'key_takeaways', 'highlights'),
    highlights: pick('highlights', 'keyTakeaways'),
    reviews: pick('reviews', 'top_10_reviews', 'topReviews'),
    top_10_reviews: pick('top_10_reviews', 'topReviews', 'reviews'),
  }
}

async function fetchWithGotScraping(url: string, headers: Record<string, string>) {
  // Dynamic import so the route still builds if the package is not installed yet.
  const mod = await import('got-scraping')
  const gotScraping = (mod as any).gotScraping || (mod as any).default?.gotScraping || (mod as any).default
  const res = await gotScraping({
    url,
    method: 'GET',
    headers,
    retry: { limit: 0 },
  })
  if (res.statusCode !== 200) {
    throw new Error(`Moctale HTTP ${res.statusCode}`)
  }
  const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body
  return body
}

async function fetchWithFetch(url: string, headers: Record<string, string>) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, { method: 'GET', headers, signal: controller.signal, cache: 'no-store' })
    if (!res.ok) throw new Error(`Moctale HTTP ${res.status}`)
    const text = await res.text()
    // Cloudflare challenge pages are HTML
    if (text.trimStart().startsWith('<!')) throw new Error('Moctale blocked by Cloudflare')
    return JSON.parse(text)
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim()
  if (!slug || !/^[a-z0-9-]{2,160}$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  }

  const url = `https://www.moctale.in/api/activity/content/${encodeURIComponent(slug)}/reviews-summary`
  const headers = moctaleHeaders(slug, authCookie())

  try {
    let raw: any
    try {
      raw = await fetchWithGotScraping(url, headers)
    } catch (gotErr: any) {
      // got-scraping missing or failed — try plain fetch (usually Cloudflare 403)
      console.warn('[moctale] got-scraping failed:', gotErr?.message || gotErr)
      raw = await fetchWithFetch(url, headers)
    }

    const data = normalizeMoctalePayload(raw)
    if (!data) {
      return new NextResponse(null, { status: 204 })
    }

    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': 'private, max-age=1800' } },
    )
  } catch (error: any) {
    console.error('[moctale] fetch failed for', slug, error?.message || error)
    return new NextResponse(null, { status: 204 })
  }
}
