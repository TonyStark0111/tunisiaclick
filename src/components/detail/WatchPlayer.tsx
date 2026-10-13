"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import StreamSection from '@/src/components/detail/StreamSection'
import DownloadDialog from '@/src/components/detail/DownloadDialog'
import Download2Button from '@/src/components/detail/Download2Button'
import EpisodeBrowser, { type Episode, type Season } from '@/src/components/detail/EpisodeBrowser'
import SectionNav, { type Section } from '@/src/components/detail/SectionNav'
import { CastRow, DetailsGrid } from '@/src/components/detail/DetailSections'
import MoreLikeThis, { type SimilarTab } from '@/src/components/detail/MoreLikeThis'
import ExtrasSection from '@/src/components/detail/ExtrasSection'
import RatingsBand from '@/src/components/social/RatingsBand'
import { useMarkWatched } from '@/src/hooks/use-media-lists'
import { useSoundtrack, type SoundtrackInitial } from '@/src/hooks/use-soundtrack'
import { toast } from '@/src/hooks/use-toast'
import { getSeasonDetails } from '@/src/app/tv/[id]/actions'
import { fillProviders } from '@/src/lib/media-assets'
import type { ProviderTemplate } from '@/src/lib/stream-providers'
import type { ExtrasGroup } from '@/src/lib/extras'
import { useT } from '@/src/components/I18nProvider'
import { Button } from '@/src/components/ui/button'

type BaseProps = {
  id: string
  title: string
  poster_path?: string | null
  backdrop_path?: string | null
  imdbId?: string
  providers: ProviderTemplate[]
  year?: string
  kids: boolean
  signedIn: boolean
  ratings: boolean
  similar: any[]
  tabs: SimilarTab[]
  extras: ExtrasGroup[]
  soundtrack: SoundtrackInitial
  data: any
}

type MovieProps = BaseProps & { kind: 'movie' }

type TvProps = BaseProps & {
  kind: 'tv'
  season: number
  episode: number
  seasons: Season[]
}

export type WatchPlayerProps = MovieProps | TvProps

function watchSections(
  t: ReturnType<typeof useT>,
  o: { episodes?: boolean; ratings: boolean; similar: boolean; extras: boolean; cast: boolean },
): Section[] {
  return [
    { id: 'streamSection', label: t('detail.watch') },
    ...(o.episodes ? [{ id: 'episodes', label: t('tv.episodes') }] : []),
    ...(o.ratings ? [{ id: 'ratings', label: t('social.ratings.title') }] : []),
    ...(o.similar ? [{ id: 'similar', label: t('detail.moreLikeThis') }] : []),
    ...(o.extras ? [{ id: 'extras', label: t('extras.title') }] : []),
    ...(o.cast ? [{ id: 'cast', label: t('detail.cast') }] : []),
    { id: 'details', label: t('detail.details') },
  ]
}

/**
 * Full stream page: player, sources, theater, download; for TV also episodes + next episode;
 * then ratings, more like this, extras, cast, details.
 */
export default function WatchPlayer(props: WatchPlayerProps) {
  const t = useT()
  const router = useRouter()
  const {
    id, title, providers, backdrop_path, imdbId, poster_path, kids, signedIn,
    ratings, similar, tabs, extras, soundtrack: initialSoundtrack, data,
  } = props

  const isTv = props.kind === 'tv'
  const season = isTv ? props.season : 1
  const episode = isTv ? props.episode : 1
  const seasons: Season[] = isTv ? props.seasons : []

  const [selectedSeason, setSelectedSeason] = useState<number | null>(isTv ? season : null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [seasonLoading, setSeasonLoading] = useState(false)
  const requestRef = useRef(0)

  const services = useMemo(
    () => fillProviders(providers, props.kind, id, season, episode),
    [providers, props.kind, id, season, episode],
  )

  const soundtrack = useSoundtrack({ type: props.kind, id, kids, initial: initialSoundtrack })
  const markWatched = useMarkWatched({
    id,
    title,
    poster_path: poster_path ?? null,
    media_type: props.kind,
  })
  const marked = useRef(false)
  useEffect(() => {
    if (marked.current) return
    if (isTv) markWatched({ season, episode })
    else markWatched()
    marked.current = true
  }, [markWatched, isTv, season, episode])

  const loadSeason = useCallback(
    async (seasonNumber: number): Promise<Episode[] | null> => {
      const request = ++requestRef.current
      setSeasonLoading(true)
      setSelectedSeason(seasonNumber)
      try {
        const details = await getSeasonDetails(id, seasonNumber)
        if (request !== requestRef.current) return null
        const list: Episode[] = details.episodes ?? []
        setEpisodes(list)
        return list
      } catch (error) {
        if (request !== requestRef.current) return null
        console.error('Error fetching season:', error)
        toast({ title: t('common.error'), description: t('tv.seasonFailed'), variant: 'destructive', duration: 3000 })
        return null
      } finally {
        if (request === requestRef.current) setSeasonLoading(false)
      }
    },
    [id, t],
  )

  // Load the current season's episodes on the TV watch page
  useEffect(() => {
    if (!isTv) return
    loadSeason(season)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, season])

  const goEpisode = useCallback(
    (s: number, e: number) => {
      markWatched({ season: s, episode: e })
      router.push(`/watch/tv/${id}?s=${s}&e=${e}`)
    },
    [markWatched, router, id],
  )

  // Next episode: same season, or first of next season
  const next = useMemo(() => {
    if (!isTv) return null
    const index = episodes.findIndex((item) => item.season_number === season && item.episode_number === episode)
    if (index >= 0 && index < episodes.length - 1) {
      return { season: episodes[index + 1].season_number, episode: episodes[index + 1].episode_number }
    }
    const following = seasons.find((s) => s.season_number > season && s.episode_count > 0)
    return following ? { season: following.season_number, episode: 1 } : null
  }, [isTv, episodes, season, episode, seasons])

  const playNext = useCallback(async () => {
    if (!next) return
    if (next.season !== selectedSeason) await loadSeason(next.season)
    goEpisode(next.season, next.episode)
  }, [next, selectedSeason, loadSeason, goEpisode])

  const code = (s: number, e: number) => t('common.seasonEpisode', { season: s, episode: e })

  const backHref = props.kind === 'movie' ? `/movie/${id}` : `/tv/${id}`
  const subtitle = isTv
    ? `${code(season, episode)}${props.year ? ` · ${props.year}` : ''}`
    : props.year || undefined

  const media = isTv
    ? { type: 'tv' as const, id, season, episode }
    : { type: 'movie' as const, id }

  const libraryMedia = useMemo(
    () => ({ media_type: props.kind, id, title, poster_path: poster_path ?? null }),
    [props.kind, id, title, poster_path],
  )

  const cast: any[] = data.credits?.cast ?? []
  const sections = useMemo(
    () =>
      watchSections(t, {
        episodes: isTv && seasons.length > 0,
        ratings,
        similar: tabs.length > 0,
        extras: extras.length > 0 || initialSoundtrack.state === 'found',
        cast: cast.length > 0,
      }),
    [t, isTv, seasons.length, ratings, tabs.length, extras.length, initialSoundtrack.state, cast.length],
  )

  const downloadTitle = isTv
    ? t('tv.downloadTitle', { name: title, season, episode })
    : title

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pb-10 pt-3 sm:px-4">
      <div className="mb-4 flex items-start gap-3">
        <Button asChild variant="secondary" size="icon" className="mt-0.5 shrink-0 rounded-full">
          <Link href={backHref} aria-label="Back">
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-white sm:text-xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-white/60">{subtitle}</p>}
        </div>
      </div>

      <SectionNav sections={sections} />

      <div className="space-y-16 pt-6">
        <StreamSection
          services={services}
          media={media}
          enabled
          backdrop={backdrop_path}
          onNext={next ? playNext : undefined}
          nextLabel={next ? `${t('detail.nextEpisode')} ${code(next.season, next.episode)}` : undefined}
          downloadSlot={
            <>
              {imdbId ? (
                props.kind === 'movie' ? (
                  <DownloadDialog type="movie" imdbId={imdbId} title={downloadTitle} />
                ) : (
                  <DownloadDialog
                    type="tv"
                    imdbId={imdbId}
                    title={downloadTitle}
                    season={season}
                    episode={episode}
                  />
                )
              ) : null}

              <Download2Button tmdbId={id} />
            </>
          }
        />

        {isTv && seasons.length > 0 && (
          <EpisodeBrowser
            id="episodes"
            seasons={seasons}
            selectedSeason={selectedSeason}
            episodes={episodes}
            loading={seasonLoading}
            current={{ season, episode }}
            onSeason={(s) => { loadSeason(s) }}
            onEpisode={(item) => goEpisode(item.season_number, item.episode_number)}
          />
        )}

        {ratings && <RatingsBand id="ratings" media={libraryMedia} />}
        {tabs.length > 0 && (
          <MoreLikeThis kind={props.kind} id={id} kids={kids} closest={similar} tabs={tabs} />
        )}
        <ExtrasSection
          type={props.kind}
          id={id}
          title={title}
          kids={kids}
          groups={extras}
          soundtrack={soundtrack}
        />
        <CastRow id="cast" cast={cast} mediaType={props.kind} mediaId={id} signedIn={signedIn} />
        <DetailsGrid id="details" kind={props.kind} data={data} soundtrack={soundtrack.status} kids={kids} />
      </div>
    </div>
  )
}
