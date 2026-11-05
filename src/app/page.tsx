import { Suspense } from 'react'
import type { Metadata } from 'next'
import BecauseYouWatched from '@/src/components/BecauseYouWatched'
import ContinueWatching from '@/src/components/ContinueWatching'
import PickOfTheDay from '@/src/components/PickOfTheDay'
import SeasonalBanner from '@/src/components/seasons/SeasonalBanner'
import UpcomingNightCard from '@/src/components/movie-night/UpcomingNightCard'
import FriendsRow from '@/src/components/social/FriendsRow'
import HubShelf from '@/src/components/hubs/HubShelf'
import { PushPrompt } from '@/src/components/PushSettings'
import { HeroSlider, PosterSlider } from '@/src/components/Sliders'
import Billboard from '@/src/components/home/Billboard'
import ChipRail from '@/src/components/home/ChipRail'
import Top10Row from '@/src/components/home/Top10Row'
import { AnniversaryRow, SeasonRows, SequelRow } from '@/src/components/home/MomentRows'
import OurFavRow from '@/src/components/home/OurFavRow'
import CinematicUniversesRail from '@/src/components/home/CinematicUniversesRail'
import UpcomingReleasesRow from '@/src/components/home/UpcomingReleasesRow'
import { AnimeRow } from '@/src/components/anime/AnimeSections'
import getMovies from './(movies)/actions'
import getTVShows from './tv/actions'
import { getLocale, getT } from '@/src/lib/i18n/server'
import { getKidsMode } from '@/src/lib/profiles'
import { isTvMode } from '@/src/lib/tv-mode'
import { getPickOfTheDay } from '@/src/lib/pick-of-the-day'
import { getCommunityTrending } from '@/src/lib/community'
import { getBillboard } from '@/src/lib/billboard'
import { getTop10 } from '@/src/lib/top10'
import { catalogueLanguage } from '@/src/lib/tmdb-locale'
import { JsonLd, websiteJsonLd } from '@/src/lib/structured-data'
import ClientMessages from '@/src/components/ClientMessages'
import { animeViewer, getAnimeRow } from '@/src/lib/anime/server'
import { withTimeout } from '@/src/lib/with-timeout'

// TMDB responses are cached for an hour by the data cache (see lib/tmdb.ts); the page itself is
// rendered per request so a TMDB hiccup can never get frozen into a static page.
export const dynamic = 'force-dynamic'
// Room for the streamed rows (each new block gives up after a few seconds on its own).
export const maxDuration = 30

// The site-wide title, description and share card (from the root layout), at its own URL.
export const metadata: Metadata = { alternates: { canonical: '/' } }

/**
 * Home page order:
 * Continue Watching → Top 10 this week → Trending Movies → Trending Series →
 * Trending Animes → Because you watched → Popular Movies → Top Rated Movies →
 * Our Fav → Anniversaries this week → Pick of the day → Now Playing →
 * Cinematic Universes → Beyond Hollywood → Upcoming Releases
 *
 * Continue Watching & Because you watched only for signed-in users (components
 * render nothing for guests).
 */
async function TrendingAnimesRow() {
  const t = getT()
  const viewer = await animeViewer()
  const cards = await withTimeout(getAnimeRow('trending', viewer), 8_000, null)
  if (!cards?.length) return null
  return <AnimeRow title={t('home.trendingAnimes')} cards={cards.slice(0, 20)} href="/anime" />
}

export default async function MainPage() {
  const kids = await getKidsMode()
  const tv = isTvMode()
  const locale = getLocale()
  const [data, tvData, pick, community, billboard] = await Promise.all([
    getMovies(kids, catalogueLanguage(locale)),
    getTVShows(kids, catalogueLanguage(locale)),
    getPickOfTheDay(kids, locale),
    getCommunityTrending(kids, locale),
    getBillboard(kids, locale),
  ])
  const top10 = await getTop10(kids, community, catalogueLanguage(locale))
  const t = getT()

  return (
    <ClientMessages scope="page">
      <div className="pb-6">
        <JsonLd data={websiteJsonLd()} />
        {/* Billboard + chip rail stay at the top as structural chrome */}
        <Billboard items={billboard} />
        <div className={billboard.length > 0 ? 'relative z-10 mt-6 space-y-10 sm:space-y-12 md:-mt-16' : 'page-top relative z-10 space-y-10 sm:space-y-12'}>
          <ChipRail />
          <Suspense fallback={null}><SeasonalBanner kids={kids} /></Suspense>

          {/* 1. Continue Watching — signed-in only */}
          <ContinueWatching />

          {/* Movie night (optional, adults only) */}
          {!kids && !tv && <Suspense fallback={null}><UpcomingNightCard /></Suspense>}

          {/* 2. Top 10 this week */}
          <Top10Row top10={top10} />

          {/* Friends (optional) */}
          {!kids && !tv && <Suspense fallback={null}><FriendsRow /></Suspense>}

          {/* Seasonal calendar rows */}
          <Suspense fallback={null}><SeasonRows kids={kids} /></Suspense>
          {!tv && <PushPrompt />}

          {/* 3. Trending Movies */}
          <PosterSlider title={t('home.trendingMovies')} href="/discover" items={data.TrendingMovies?.results} />

          {/* 4. Trending Series */}
          <PosterSlider title={t('home.trendingSeries')} href="/tv" kind="tv" items={tvData.trendingTVShows?.results} />

          {/* 5. Trending Animes */}
          {!kids && (
            <Suspense fallback={null}>
              <TrendingAnimesRow />
            </Suspense>
          )}

          {/* 6. Because you watched — signed-in only */}
          <BecauseYouWatched />

          {/* 7. Popular Movies */}
          <PosterSlider title={t('home.popularMovies')} items={data.popularMovies?.results} />

          {/* 8. Top Rated Movies */}
          <PosterSlider title={t('home.topRatedMovies')} href="/top-rated" items={data.topRatedMovies?.results} />

          {/* 9. Our Fav */}
          <Suspense fallback={null}><OurFavRow /></Suspense>

          {/* 10. Anniversaries this week */}
          <Suspense fallback={null}><AnniversaryRow kids={kids} /></Suspense>

          {/* 11. Pick of the day */}
          <PickOfTheDay pick={pick} />

          {/* 12. Now Playing */}
          <HeroSlider title={t('home.nowPlaying')} items={data.nowPlayingMovies?.results} />

          {/* 13. Cinematic Universes */}
          {!kids && <Suspense fallback={null}><CinematicUniversesRail kids={kids} /></Suspense>}

          {/* 14. Beyond Hollywood */}
          {!kids && <Suspense fallback={null}><HubShelf kids={kids} /></Suspense>}

          {/* Sequel row (kept as extra, not in the named list) */}
          <Suspense fallback={null}><SequelRow kids={kids} /></Suspense>

          {/* Community trending if distinct from Top 10 */}
          {top10.source !== 'site' && (
            <PosterSlider title={t('home.communityTrending')} items={community} kind="mixed" />
          )}

          {/* 15. Upcoming Releases — Moviezonne-style, 10 cards + See all → /upcoming */}
          <UpcomingReleasesRow items={data.upcomingMovies?.results} />
        </div>
      </div>
    </ClientMessages>
  )
}
