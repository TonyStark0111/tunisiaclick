import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PageHeader from '@/src/components/browse/PageHeader'
import MediaGrid, { EmptyState } from '@/src/components/MediaGrid'
import PageNav from '@/src/components/PageNav'
import { getProviderById, TMDB_LOGO_BASE, PROVIDERS_LIST } from '@/src/lib/providers'
import { getList, parsePage } from '@/src/lib/lists'
import { pageMetadata } from '@/src/lib/seo'
import { catalogueLanguage } from '@/src/lib/tmdb-locale'
import { getLocale } from '@/src/lib/i18n/server'
import { getKidsMode } from '@/src/lib/profiles'
import { kidsDiscoverParams } from '@/src/lib/kids'

export const dynamic = 'force-dynamic'

type Props = {
  params: { id: string }
  searchParams: { page?: string; type?: string }
}

export function generateStaticParams() {
  return PROVIDERS_LIST.map((p) => ({ id: p.id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const provider = getProviderById(params.id)
  if (!provider) return { title: 'Provider not found' }
  return pageMetadata({
    title: provider.name,
    description: provider.tagline,
    path: `/exploreworld/${provider.id}`,
  })
}

/**
 * /exploreworld/[id] — content available on a specific streaming provider (TMDB watch providers).
 */
export default async function ProviderDetailPage({ params, searchParams }: Props) {
  const provider = getProviderById(params.id)
  if (!provider) notFound()

  const kind = searchParams.type === 'tv' ? 'tv' : 'movie'
  const page = parsePage(searchParams.page)
  const kids = await getKidsMode()
  const locale = getLocale()
  const lang = catalogueLanguage(locale)

  const path = kind === 'tv' ? '/discover/tv' : '/discover/movie'
  const kidsParams = kids ? kidsDiscoverParams(kind) : {}

  const { results, totalPages, failed } = await getList(path, page, {
    with_watch_providers: provider.tmdbId,
    watch_region: 'US',
    sort_by: 'popularity.desc',
    include_adult: false,
    language: lang,
    ...kidsParams,
  })

  const typeBase = `/exploreworld/${provider.id}`

  return (
    <div className="pb-16">
      <div className="page-x page-top mb-2">
        <Link
          href="/exploreworld"
          className="inline-flex items-center gap-1.5 text-sm text-white/55 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Explore World
        </Link>
      </div>

      <PageHeader
        title={
          <span className="inline-flex items-center gap-3 sm:gap-4">
            <span
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] ring-1 ring-white/15 sm:h-14 sm:w-14 sm:rounded-[16px]"
              style={{ backgroundColor: provider.bgColor }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${TMDB_LOGO_BASE}${provider.logoPath}`}
                alt={`${provider.name} logo`}
                className="h-full w-full object-cover"
              />
            </span>
            {provider.name}
          </span>
        }
        subtitle={provider.tagline}
      >
        <div className="flex rounded-full border border-white/10 bg-white/[0.04] p-1 text-sm">
          <Link
            href={`${typeBase}?type=movie`}
            className={`rounded-full px-4 py-1.5 transition-colors ${
              kind === 'movie' ? 'bg-white text-black' : 'text-white/70 hover:text-white'
            }`}
          >
            Movies
          </Link>
          <Link
            href={`${typeBase}?type=tv`}
            className={`rounded-full px-4 py-1.5 transition-colors ${
              kind === 'tv' ? 'bg-white text-black' : 'text-white/70 hover:text-white'
            }`}
          >
            TV Shows
          </Link>
        </div>
      </PageHeader>

      <div className="page-x">
        {failed ? (
          <EmptyState title="Couldn’t load titles">
            Try again in a moment.
          </EmptyState>
        ) : results.length === 0 ? (
          <EmptyState title="Nothing here yet">
            No {kind === 'tv' ? 'TV shows' : 'movies'} found for {provider.name} right now.
          </EmptyState>
        ) : (
          <>
            <MediaGrid items={results} kind={kind} />
            <PageNav currentPage={page} totalPages={totalPages} />
          </>
        )}
      </div>
    </div>
  )
}
