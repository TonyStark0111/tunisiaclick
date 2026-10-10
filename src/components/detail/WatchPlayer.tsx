"use client"
import React, { useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import StreamSection from '@/src/components/detail/StreamSection'
import DownloadDialog from '@/src/components/detail/DownloadDialog'
import SectionNav, { type Section } from '@/src/components/detail/SectionNav'
import { CastRow, DetailsGrid } from '@/src/components/detail/DetailSections'
import MoreLikeThis, { type SimilarTab } from '@/src/components/detail/MoreLikeThis'
import ExtrasSection from '@/src/components/detail/ExtrasSection'
import RatingsBand from '@/src/components/social/RatingsBand'
import { useMarkWatched } from '@/src/hooks/use-media-lists'
import { useSoundtrack, type SoundtrackInitial } from '@/src/hooks/use-soundtrack'
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

type MovieProps = BaseProps & {
  kind: 'movie'
}

type TvProps = BaseProps & {
  kind: 'tv'
  season: number
  episode: number
}

export type WatchPlayerProps = MovieProps | TvProps

function watchSections(t: ReturnType<typeof useT>, o: { ratings: boolean; similar: boolean; extras: boolean; cast: boolean }): Section[] {
  return [
    { id: 'streamSection', label: t('detail.watch') },
    ...(o.ratings ? [{ id: 'ratings', label: t('social.ratings.title') }] : []),
    ...(o.similar ? [{ id: 'similar', label: t('detail.moreLikeThis') }] : []),
    ...(o.extras ? [{ id: 'extras', label: t('extras.title') }] : []),
    ...(o.cast ? [{ id: 'cast', label: t('detail.cast') }] : []),
    { id: 'details', label: t('detail.details') },
  ]
}

/**
 * Full stream page: player + sources + theater + download, then ratings, more like this, extras, cast, details.
 */
export default function WatchPlayer(props: WatchPlayerProps) {
  const t = useT()
  const {
    id, title, providers, backdrop_path, imdbId, poster_path, kids, signedIn,
    ratings, similar, tabs, extras, soundtrack: initialSoundtrack, data,
  } = props

  const season = props.kind === 'tv' ? props.season : 1
  const episode = props.kind === 'tv' ? props.episode : 1

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
    if (!marked.current) {
      if (props.kind === 'tv') markWatched({ season, episode })
      else markWatched()
      marked.current = true
    }
  }, [markWatched, props.kind, season, episode])

  const backHref = props.kind === 'movie' ? `/movie/${id}` : `/tv/${id}`
  const subtitle =
    props.kind === 'tv'
      ? `S${season}:E${episode}${props.year ? ` · ${props.year}` : ''}`
      : props.year || undefined

  const media =
    props.kind === 'movie'
      ? { type: 'movie' as const, id }
      : { type: 'tv' as const, id, season, episode }

  const libraryMedia = useMemo(
    () => ({ media_type: props.kind, id, title, poster_path: poster_path ?? null }),
    [props.kind, id, title, poster_path],
  )

  const cast: any[] = data.credits?.cast ?? []
  const sections = useMemo(
    () =>
      watchSections(t, {
        ratings,
        similar: tabs.length > 0,
        extras: extras.length > 0 || initialSoundtrack.state === 'found',
        cast: cast.length > 0,
      }),
    [t, ratings, tabs.length, extras.length, initialSoundtrack.state, cast.length],
  )

  const downloadTitle =
    props.kind === 'tv'
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
          downloadSlot={
            imdbId ? (
              props.kind === 'movie' ? (
                <DownloadDialog type="movie" imdbId={imdbId} title={downloadTitle} />
              ) : (
                <DownloadDialog type="tv" imdbId={imdbId} title={downloadTitle} season={season} episode={episode} />
              )
            ) : undefined
          }
        />

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
