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
import UpcomingReleases from '@/src/components/home/UpcomingReleases'
import { getUpcomingReleases } from '@/src/lib/upcoming-releases'
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

// TMDB responses are cached for an hour by the data cache (see lib/tmdb.ts); the page itself is
// rendered per request so a TMDB hiccup can never get frozen into a static page.
export const dynamic = 'force-dynamic'
// Room for the streamed rows (each new block gives up after a few seconds on its own).
export const maxDuration = 30

// The site-wide title, description and share card (from the root layout), at its own URL.
export const metadata: Metadata = { alternates: { canonical: '/' } }

/**
 * The home page order: Continue Watching, Top 10, Trending Movies, Trending Series, Because you
 * watched, Popular, Top Rated, Our Fav, Anniversaries, Now Playing, Cinematic Universes,
 * Beyond Hollywood, Pick of the day, Upcoming Releases. Blocks render nothing when they have
 * nothing to show, and stream in on their own.
 */
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
  const upcomingReleases = await getUpcomingReleases(catalogueLanguage(locale), 6)
  const t = getT()

  return (
    <ClientMessages scope="page">
      <div className="pb-6">
        <JsonLd data={websiteJsonLd()} />
        {/* 1 */}
        <Billboard items={billboard} />
        {/* On desktop the first rows rise into the billboard's fade. */}
        {/* Without a billboard (a Kids profile with nothing kid-safe to feature), clear the top bar. */}
        <div className={billboard.length > 0 ? 'relative z-10 mt-6 space-y-10 sm:space-y-12 md:-mt-16' : 'page-top relative z-10 space-y-10 sm:space-y-12'}>
          {/* 2 */}
          <ChipRail />
          {/* 3. Seasonal: at most one banner, only in season (Ramadan, the Eids...). */}
          <Suspense fallback={null}><SeasonalBanner kids={kids} /></Suspense>
          {/* 4. Continue Watching: signed-in users only; renders nothing for guests. */}
          <ContinueWatching />
          {/* A grown-up's movie night in the next 7 days. */}
          {!kids && !tv && <Suspense fallback={null}><UpcomingNightCard /></Suspense>}
          {/* 5. Top 10 this week */}
          <Top10Row top10={top10} />
          {/* What friends are watching (grown-ups whose friends share it). */}
          {!kids && !tv && <Suspense fallback={null}><FriendsRow /></Suspense>}
          {/* Whatever the calendar says is on (Halloween, Eid, summer...): streamed in. */}
          <Suspense fallback={null}><SeasonRows kids={kids} /></Suspense>
          {/* Installed app only: invite to get the pick as a notification. */}
          {!tv && <PushPrompt />}
          {/* 6. Trending Movies */}
          <PosterSlider title={t('home.trendingMovies')} href="/discover" items={data.TrendingMovies?.results} />
          {/* 7. Trending Series, See all opens /tv */}
          <PosterSlider title={t('home.trendingSeries')} href="/tv" kind="tv" items={tvData.trendingTVShows?.results} />
          {/* 8. Because you watched */}
          <BecauseYouWatched />
          {/* What people on the site watched this week, unless it already made the Top 10. */}
          {top10.source !== 'site' && <PosterSlider title={t('home.communityTrending')} items={community} kind="mixed" />}
          {/* 9. Popular Movies */}
          <PosterSlider title={t('home.popularMovies')} items={data.popularMovies?.results} />
          {/* 10. Top Rated Movies */}
          <PosterSlider title={t('home.topRatedMovies')} href="/top-rated" items={data.topRatedMovies?.results} />
          {/* 11. Our Fav (manual download titles only) */}
          <Suspense fallback={null}><OurFavRow /></Suspense>
          {/* 12. Anniversaries this week */}
          <Suspense fallback={null}><AnniversaryRow kids={kids} /></Suspense>
          {/* 13. Now Playing */}
          <HeroSlider title={t('home.nowPlaying')} items={data.nowPlayingMovies?.results} />
          {/* 14. Cinematic Universes (MCU, DC, Star Wars, YRF Spy, Cop Universe…) */}
          {!kids && <Suspense fallback={null}><CinematicUniversesRail kids={kids} /></Suspense>}
          {/* Sequels row */}
          <Suspense fallback={null}><SequelRow kids={kids} /></Suspense>
          {/* 15. Beyond Hollywood: one door per hub. */}
          {!kids && <Suspense fallback={null}><HubShelf kids={kids} /></Suspense>}
          {/* 16. Pick of the day */}
          <PickOfTheDay pick={pick} />
          {/* 17. Upcoming Releases — MovieZone-style grid */}
          <UpcomingReleases items={upcomingReleases} limit={1} showSeeAll />
        </div>
      </div>
    </ClientMessages>
  )
}
