import PosterCard from '@/src/components/PosterCard'
import { EmptyState, GRID_CLASS } from '@/src/components/MediaGrid'
import PageHeader from '@/src/components/browse/PageHeader'
import PageNav from '@/src/components/PageNav'
import { cardProps } from '@/src/lib/card-props'
import { getOurFavPage } from '@/src/lib/our-fav'
import { getLocale } from '@/src/lib/i18n/server'
import { catalogueLanguage } from '@/src/lib/tmdb-locale'
import { pageMetadata } from '@/src/lib/seo'

export const dynamic = 'force-dynamic'

export const generateMetadata = () =>
  pageMetadata({
    title: 'Our Fav',
    description: 'Hand-picked titles with manual download links',
    path: '/our-fav',
  })

function parsePage(value?: string) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

/**
 * Full Our Fav page — only content that has manual download support.
 * Supports ?page=2, ?page=3, …
 */
export default async function OurFavPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }> | { page?: string }
}) {
  const sp = await Promise.resolve(searchParams)
  const page = parsePage(sp.page)
  const language = catalogueLanguage(getLocale())
  const { results, totalPages, total } = await getOurFavPage(page, 20, language)

  return (
    <div className="pb-10">
      <PageHeader
        title="Our Fav"
        subtitle={
          total > 0
            ? `${total} title${total === 1 ? '' : 's'} with download links`
            : 'Hand-picked titles with download links'
        }
      />
      <div className="page-x">
        {results.length === 0 ? (
          <EmptyState>No Our Fav titles yet. Add links in the manual download files.</EmptyState>
        ) : (
          <>
            <ol className={GRID_CLASS}>
              {results.map((item: any) => {
                const kind = item.media_type === 'tv' ? 'tv' : 'movie'
                const props = cardProps(item, kind)
                return (
                  <li key={`${kind}-${item.id}`}>
                    <PosterCard
                      {...props}
                      showTypeBadge={false}
                      voteAverage={undefined}
                    />
                  </li>
                )
              })}
            </ol>
            <PageNav currentPage={page} totalPages={totalPages} />
          </>
        )}
      </div>
    </div>
  )
}
