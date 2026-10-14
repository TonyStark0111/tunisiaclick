/**
 * Our Fav — titles that have manual download links (movies + series).
 * Used by the home row and the /our-fav browse page.
 */
import { MANUAL_MOVIES_DOWNLOADS } from '@/src/data/manual-movies-downloads'
import { MANUAL_SERIES_DOWNLOADS } from '@/src/data/manual-series-downloads'
import { tmdbFetchSafe } from '@/src/lib/tmdb'

export type OurFavRef = { id: string; kind: 'movie' | 'tv' }

/** All TMDB IDs that appear in the manual download files (movies first, then series). */
export function listOurFavIds(): OurFavRef[] {
  const movies = Object.keys(MANUAL_MOVIES_DOWNLOADS).map((id) => ({ id, kind: 'movie' as const }))
  const series = Object.keys(MANUAL_SERIES_DOWNLOADS).map((id) => ({ id, kind: 'tv' as const }))
  return [...movies, ...series]
}

export type OurFavPage = {
  results: any[]
  page: number
  totalPages: number
  total: number
}

/**
 * Fetch one page of Our Fav posters from TMDB.
 * Missing / failed IDs are skipped so the grid still renders.
 */
export async function getOurFavPage(
  page = 1,
  pageSize = 20,
  language?: string,
): Promise<OurFavPage> {
  const all = listOurFavIds()
  const total = all.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)
  const slice = all.slice((safePage - 1) * pageSize, safePage * pageSize)

  const results = (
    await Promise.all(
      slice.map(async ({ id, kind }) => {
        const data = await tmdbFetchSafe(
          `${kind}/${id}`,
          language ? { language } : {},
          3600,
        )
        if (!data) return null
        return {
          ...data,
          id: Number(data.id ?? id),
          media_type: kind,
          title: data.title || data.name,
        }
      }),
    )
  ).filter(Boolean)

  return { results, page: safePage, totalPages, total }
}

/** First N items for the home row (no pagination). */
export async function getOurFavRow(limit = 20, language?: string): Promise<any[]> {
  const { results } = await getOurFavPage(1, limit, language)
  return results
}
