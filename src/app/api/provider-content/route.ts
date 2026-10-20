// GET /api/provider-content?id=<providerId>&type=movie|tv&page=N
// Returns the next page of titles for a streaming provider (TMDB watch providers).
import { NextResponse } from 'next/server'
import { getProviderById } from '@/src/lib/providers'
import { getList, parsePage } from '@/src/lib/lists'
import { getKidsMode } from '@/src/lib/profiles'
import { getLocale } from '@/src/lib/i18n/server'
import { catalogueLanguage } from '@/src/lib/tmdb-locale'
import { kidsDiscoverParams } from '@/src/lib/kids'
import { clientIp, rateLimit, tooManyRequests } from '@/src/lib/rate-limit'

export const dynamic = 'force-dynamic'

const bad = (code: string) =>
  NextResponse.json({ code }, { status: 400, headers: { 'Cache-Control': 'no-store' } })

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const id = params.get('id') ?? ''
  const type = params.get('type')
  const page = parsePage(params.get('page') ?? '1')

  if (type !== 'movie' && type !== 'tv') return bad('invalid_type')
  const provider = getProviderById(id)
  if (!provider) return bad('invalid_provider')

  const limit = await rateLimit(`provider-content:${clientIp(request.headers)}`, 90, 60)
  if (!limit.ok) return tooManyRequests(limit.retryAfter)

  const kids = await getKidsMode()
  const locale = getLocale()
  const lang = catalogueLanguage(locale)
  const path = type === 'tv' ? '/discover/tv' : '/discover/movie'
  const kidsParams = kids ? kidsDiscoverParams(type) : {}

  const { results, totalPages, failed } = await getList(path, page, {
    with_watch_providers: provider.tmdbId,
    watch_region: 'US',
    sort_by: 'popularity.desc',
    include_adult: false,
    language: lang,
    ...kidsParams,
  })

  if (failed) {
    return NextResponse.json(
      { code: 'tmdb_unavailable' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  return NextResponse.json(
    { results, totalPages, page },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
