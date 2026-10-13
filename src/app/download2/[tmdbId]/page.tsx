import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getManualMovieDownloads } from '@/src/data/manual-movies-downloads'
import { getManualSeriesDownloads } from '@/src/data/manual-series-downloads'
import ManualMoviesDownloadLinks from '@/src/components/detail/ManualMoviesDownloadLinks'
import ManualSeriesDownloadLinks from '@/src/components/detail/ManualSeriesDownloadLinks'

type Props = {
  params: Promise<{ tmdbId: string }>
  searchParams: Promise<{ type?: string }>
}

/**
 * Standalone manual download page.
 * Route: /download2/<tmdbId>?type=movie|tv
 *
 * - type=movie → ManualMoviesDownloadLinks
 * - type=tv    → ManualSeriesDownloadLinks
 * - no type    → tries movie first, then series
 */
export default async function Download2Page({ params, searchParams }: Props) {
  const { tmdbId } = await params
  const { type } = await searchParams

  const movieEntry = type === 'tv' ? null : getManualMovieDownloads(tmdbId)
  const seriesEntry = type === 'movie' ? null : getManualSeriesDownloads(tmdbId)

  const isMovie = !!movieEntry
  const isSeries = !isMovie && !!seriesEntry
  const entry = movieEntry ?? seriesEntry

  if (!entry) {
    notFound()
  }

  const backHref = isSeries ? `/tv/${tmdbId}` : `/movie/${tmdbId}`

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href={backHref}
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to title
        </Link>

        {isMovie && <ManualMoviesDownloadLinks entry={entry} />}
        {isSeries && <ManualSeriesDownloadLinks entry={entry} />}

        <p className="mt-12 text-center text-xs text-white/30">
          Links are provided by the site administrators. Use at your own risk.
        </p>
      </div>
    </div>
  )
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { tmdbId } = await params
  const { type } = await searchParams
  const movieEntry = type === 'tv' ? null : getManualMovieDownloads(tmdbId)
  const seriesEntry = type === 'movie' ? null : getManualSeriesDownloads(tmdbId)
  const entry = movieEntry ?? seriesEntry
  return {
    title: entry ? `${entry.mainTitle} · Download` : 'Download',
    robots: { index: false, follow: false },
  }
}
