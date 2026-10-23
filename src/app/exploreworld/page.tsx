import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Clapperboard, Radio, Tv } from 'lucide-react'
import PageHeader from '@/src/components/browse/PageHeader'
import ProviderRow from '@/src/components/providers/ProviderRow'
import { PROVIDERS_LIST, TMDB_LOGO_BASE } from '@/src/lib/providers'
import { pageMetadata } from '@/src/lib/seo'
import Top10Row from '@/src/components/home/Top10Row'
import OurFavRow from '@/src/components/home/OurFavRow'
import HubShelf from '@/src/components/hubs/HubShelf'
import { PosterSlider } from '@/src/components/Sliders'
import { AnimeRow } from '@/src/components/anime/AnimeSections'
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

/** Trending anime row from AniList — streams in independently. */
async function TrendingAnimeRow() {
  const t = getT()
  const viewer = await animeViewer()
  const cards = await withTimeout(getAnimeRow('trending', viewer), 12_000, null)
  if (!cards?.length) return null
  return <AnimeRow title={t('anime.row.trending') ?? 'Trending Animes'} cards={cards} href="/anime" />
}

/**
 * Destination cards for Live TV and Clips (full pages live elsewhere).
 */
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
 * Layout (exact order requested):
 * 1. Header — Explore World + subtitle
 * 2. Browse by provider
 * 3. Top 10 this week
 * 4. Trending Movies  → /discover
 * 5. Trending Series  → /tv
 * 6. Trending Animes  → /anime (AniList)
 * 7. Our Fav          → /our-fav
 * 8. Beyond Hollywood (world cinema · K-drama · C-dramas · Thai · Turkish)
 * 9. Live TV          → /live-tv
 * 10. Clips           → /clips
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
        {/* 1. Browse by provider */}
        <section className="mt-2 sm:mt-0">
          <ProviderRow title="Browse by Provider" basePath="/exploreworld" />
        </section>

        {/* 2. Top 10 this week */}
        <Top10Row top10={top10} />

        {/* 3. Trending Movies → /discover */}
        <PosterSlider
          title={t('home.trendingMovies') ?? 'Trending Movies'}
          href="/discover"
          items={movieData.TrendingMovies?.results}
        />

        {/* 4. Trending Series → /tv */}
        <PosterSlider
          title={t('home.trendingSeries') ?? 'Trending Series'}
          href="/tv"
          kind="tv"
          items={tvData.trendingTVShows?.results}
        />

        {/* 5. Trending Animes → /anime (AniList) */}
        <Suspense fallback={null}>
          <TrendingAnimeRow />
        </Suspense>

        {/* 6. Our Fav → /our-fav */}
        <Suspense fallback={null}>
          <OurFavRow />
        </Suspense>

        {/* 7. Beyond Hollywood — world cinema · kdrama · cdramas · thai · turkish */}
        {!kids && (
          <Suspense fallback={null}>
            <HubShelf kids={kids} />
          </Suspense>
        )}

        {/* 8–9. Live TV + Clips destination cards */}
        <DestinationCards />

        {/* Full provider grid (kept for large-screen scanning) */}
        <section className="page-x mt-4 sm:mt-6">
          <h2 className="mb-6 font-display text-lg font-bold tracking-tight text-white sm:text-xl">
            All providers
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-6">
            {PROVIDERS_LIST.map((provider) => (
              <Link
                key={provider.id}
                href={`/exploreworld/${provider.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }}
              >
                <div
                  className="relative flex aspect-[16/10] items-center justify-center p-6 transition-shadow duration-300 group-hover:shadow-[0_0_28px_var(--glow)]"
                  style={
                    {
                      backgroundColor: provider.bgColor,
                      ['--glow' as string]: provider.glowColor,
                    } as React.CSSProperties
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${TMDB_LOGO_BASE}${provider.logoPath}`}
                    alt=""
                    className="max-h-14 max-w-[70%] object-contain sm:max-h-16"
                    loading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20" />
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3.5 sm:p-4">
                  <p className="font-display text-[15px] font-semibold text-white">{provider.name}</p>
                  <p className="line-clamp-2 text-[12px] leading-snug text-white/45">{provider.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
