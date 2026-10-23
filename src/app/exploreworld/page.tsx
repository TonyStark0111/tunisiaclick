import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Clapperboard, Radio } from 'lucide-react'
import PageHeader from '@/src/components/browse/PageHeader'
import ProviderRow from '@/src/components/providers/ProviderRow'
import { pageMetadata } from '@/src/lib/seo'
import Top10Row from '@/src/components/home/Top10Row'
import OurFavRow from '@/src/components/home/OurFavRow'
import HubShelf from '@/src/components/hubs/HubShelf'
import { PosterSlider } from '@/src/components/Sliders'
import { AnimeRow } from '@/src/components/anime/AnimeSections'
import ClientMessages from '@/src/components/ClientMessages'
import getMovies from '@/src/app/(movies)/actions'
import getTVShows from '@/src/app/tv/actions'
import { getTop10 } from '@/src/lib/top10'
import { getCommunityTrending } from '@/src/lib/community'
import { getLocale, getT } from '@/src/lib/i18n/server'
import { getKidsMode } from '@/src/lib/profiles'
import { catalogueLanguage } from '@/src/lib/tmdb-locale'
import { animeViewer, getAnimeRow } from '@/src/lib/anime/server'
import { withTimeout } from '@/src/lib/with-timeout'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export const generateMetadata = (): Metadata => {
  return pageMetadata({
    title: 'Explore World',
    description:
      'Pick a streaming service, browse Top 10, trending movies, series, anime, Our Fav, world cinema, Live TV and clips.',
    path: '/exploreworld',
  })
}

/**
 * Trending anime from AniList.
 * Wrapped in ClientMessages scope="anime/layout" so AnimeCard can resolve
 * anime.format.* / anime.nextEp / anime.ep (otherwise raw keys show on the badge).
 */
async function TrendingAnimeRow() {
  const viewer = await animeViewer()
  const cards = await withTimeout(getAnimeRow('trending', viewer), 12_000, null)
  if (!cards?.length) return null
  return (
    <ClientMessages scope="anime/layout">
      <AnimeRow title="Trending Animes" cards={cards} href="/anime" />
    </ClientMessages>
  )
}

/** Destination cards for Live TV and Clips. */
function DestinationCards() {
  const cards = [
    {
      href: '/live-tv',
      title: 'Live TV',
      subtitle: 'Channels, schedules and live streams',
      icon: Radio,
      accent: 'from-emerald-500/25 to-teal-600/10',
      ring: 'hover:border-emerald-400/40',
    },
    {
      href: '/clips',
      title: 'Clips',
      subtitle: 'Short moments, trailers and highlights',
      icon: Clapperboard,
      accent: 'from-violet-500/25 to-fuchsia-600/10',
      ring: 'hover:border-violet-400/40',
    },
  ] as const

  return (
    <section className="page-x" aria-label="Live TV and Clips">
      <h2 className="mb-4 font-display text-lg font-bold tracking-tight text-white sm:text-xl">
        Watch now
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map(({ href, title, subtitle, icon: Icon, accent, ring }) => (
          <Link
            key={href}
            href={href}
            className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.06] ${ring}`}
          >
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} ring-1 ring-inset ring-white/10`}
            >
              <Icon className="h-6 w-6 text-white" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[17px] font-semibold text-white">{title}</p>
              <p className="mt-0.5 text-[13px] text-white/50">{subtitle}</p>
            </div>
            <span className="text-white/30 transition-colors group-hover:text-white/70" aria-hidden>
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

/**
 * /exploreworld — Discovery hub.
 *
 * 1. Header
 * 2. Browse by provider
 * 3. Top 10 this week
 * 4. Trending Movies  → /discover
 * 5. Trending Series  → /tv
 * 6. Trending Animes  → /anime (AniList)
 * 7. Our Fav          → /our-fav
 * 8. Beyond Hollywood (world cinema · K-drama · C-dramas · Thai · Turkish)
 * 9. Live TV          → /live-tv
 * 10. Clips           → /clips
 *
 * No “All providers” grid — Browse by Provider already covers that.
 */
export default async function ExploreWorldPage() {
  const kids = await getKidsMode()
  const locale = getLocale()
  const language = catalogueLanguage(locale)
  const t = getT()

  const [movieData, tvData, community] = await Promise.all([
    getMovies(kids, language),
    getTVShows(kids, language),
    getCommunityTrending(kids, locale),
  ])
  const top10 = await getTop10(kids, community, language)

  return (
    <div className="pb-16">
      <PageHeader
        title="Explore World"
        subtitle="Pick a streaming service and discover what’s available to watch."
      />

      <div className="space-y-10 sm:space-y-12">
        {/* Browse by provider */}
        <section className="mt-2 sm:mt-0">
          <ProviderRow title="Browse by Provider" basePath="/exploreworld" />
        </section>

        {/* Top 10 this week */}
        <Top10Row top10={top10} />

        {/* Trending Movies → /discover */}
        <PosterSlider
          title={t('home.trendingMovies') ?? 'Trending Movies'}
          href="/discover"
          items={movieData.TrendingMovies?.results}
        />

        {/* Trending Series → /tv */}
        <PosterSlider
          title={t('home.trendingSeries') ?? 'Trending Series'}
          href="/tv"
          kind="tv"
          items={tvData.trendingTVShows?.results}
        />

        {/* Trending Animes → /anime (AniList) — ClientMessages loads anime.format / nextEp strings */}
        <Suspense fallback={null}>
          <TrendingAnimeRow />
        </Suspense>

        {/* Our Fav → /our-fav */}
        <Suspense fallback={null}>
          <OurFavRow />
        </Suspense>

        {/* Beyond Hollywood */}
        {!kids && (
          <Suspense fallback={null}>
            <HubShelf kids={kids} />
          </Suspense>
        )}

        {/* Live TV + Clips */}
        <DestinationCards />
      </div>
    </div>
  )
}
