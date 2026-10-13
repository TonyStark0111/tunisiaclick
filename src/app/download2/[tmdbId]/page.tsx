import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getManualDownloads } from '@/src/data/manual-downloads'
import ManualDownloadLinks from '@/src/components/detail/ManualDownloadLinks'

type Props = {
  params: Promise<{ tmdbId: string }>
}

/**
 * Completely new standalone page for manual / theatre-style download links.
 * Route: /download2/<tmdbId>
 *
 * Example: /download2/1291595
 */
export default async function Download2Page({ params }: Props) {
  const { tmdbId } = await params
  const entry = getManualDownloads(tmdbId)

  if (!entry) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Back */}
        <Link
          href={`/movie/${tmdbId}`}
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to title
        </Link>

        <ManualDownloadLinks entry={entry} />

        <p className="mt-12 text-center text-xs text-white/30">
          Links are provided by the site administrators. Use at your own risk.
        </p>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: Props) {
  const { tmdbId } = await params
  const entry = getManualDownloads(tmdbId)
  return {
    title: entry ? `${entry.mainTitle} · Download` : 'Download',
    robots: { index: false, follow: false },
  }
}
