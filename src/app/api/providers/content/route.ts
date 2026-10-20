/**
 * GET /api/providers/content?providerId=8&type=movie|tv&page=1
 * Returns a page of titles available on a TMDB watch provider (infinite-scroll feed).
 */
import { NextResponse } from 'next/server'
import { getList, parsePage } from '@/src/lib/lists'
import { getKidsMode } from '@/src/lib/profiles'
import { getLocale } from '@/src/lib/i18n/server'
import { catalogueLanguage } from '@/src/lib/tmdb-locale'
import { kidsDiscoverParams } from '@/src/lib/kids'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const providerId = Number(params.get('providerId'))
  const type = params.get('type') === 'tv' ? 'tv' : 'movie'
  const page = parsePage(params.get('page') ?? '1')

  if (!Number.isInteger(providerId) || providerId < 1 || providerId > 99999) {
    return NextResponse.json({ code: 'invalid_provider' }, { status: 400 })
  }

  const kids = await getKidsMode()
  const locale = getLocale()
  const lang = catalogueLanguage(locale)
  const path = type === 'tv' ? '/discover/tv' : '/discover/movie'
  const kidsParams = kids ? kidsDiscoverParams(type) : {}

  const { results, totalPages, failed } = await getList(path, page, {
    with_watch_providers: providerId,
    watch_region: 'US',
    sort_by: 'popularity.desc',
    include_adult: false,
    language: lang,
    ...kidsParams,
  })

  if (failed) {
    return NextResponse.json({ code: 'tmdb_unavailable' }, { status: 502 })
  }

  return NextResponse.json(
    {
      results,
      page,
      totalPages,
      hasMore: page < totalPages && results.length > 0,
      type,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  )
}
