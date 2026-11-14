'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, HardDrive, Magnet, CloudDownload } from 'lucide-react'
import { cn } from '@/src/lib/utils'
import MoviezoneDownloadLinks from '@/src/components/detail/MoviezoneDownloadLinks'
import ManualMoviesDownloadLinks from '@/src/components/detail/ManualMoviesDownloadLinks'
import ManualSeriesDownloadLinks from '@/src/components/detail/ManualSeriesDownloadLinks'
import TorrentDownloadPanel from '@/src/components/detail/TorrentDownloadPanel'
import type { DownloadQuery } from '@/src/app/actions/downloads'
import type { ManualDownloadEntry as MovieEntry } from '@/src/data/manual-movies-downloads'
import type { ManualDownloadEntry as SeriesEntry } from '@/src/data/manual-series-downloads'

type TabId = 'moviezone' | 'manual' | 'torrent'

type Props = {
  tmdbId: string
  kind: 'movie' | 'tv'
  title: string
  year?: string
  season?: number
  episode?: number
  imdbId?: string | null
  backHref: string
  movieManual: MovieEntry | null
  seriesManual: SeriesEntry | null
}

const TABS: {
  id: TabId
  label: string
  short: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}[] = [
  {
    id: 'moviezone',
    label: 'Download 1 · Direct servers',
    short: 'Download 1',
    icon: CloudDownload,
    description: '02Downloader, NxSha, VidSync, VidVault — open in a new tab',
  },
  {
    id: 'manual',
    label: 'Download 2 · Manual links',
    short: 'Download 2',
    icon: HardDrive,
    description: 'Curated links maintained by the site',
  },
  {
    id: 'torrent',
    label: 'Download 3 · Torrents',
    short: 'Download 3',
    icon: Magnet,
    description: 'Chillax YTS · quality buttons download .torrent files',
  },
]

export default function DownloadHub({
  tmdbId,
  kind,
  title,
  year,
  season = 1,
  episode = 1,
  imdbId,
  backHref,
  movieManual,
  seriesManual,
}: Props) {
  const [tab, setTab] = useState<TabId>('moviezone')

  const manualEntry = kind === 'movie' ? movieManual : seriesManual
  const hasManual = !!manualEntry

  const torrentQuery: DownloadQuery | null = imdbId
    ? kind === 'movie'
      ? { type: 'movie', imdbId }
      : { type: 'tv', imdbId, season, episode }
    : null

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          Back
        </Link>

        <header className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
              <Download className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Download
              </h1>
              <p className="mt-0.5 truncate text-sm text-white/55">
                {title}
                {year ? ` · ${year}` : ''}
                {kind === 'tv' ? ` · S${season}:E${episode}` : ''}
              </p>
            </div>
          </div>
          <p className="text-sm text-white/45">
            Choose how you want to download. Each option uses a different source.
          </p>
        </header>

        <div className="mb-6 grid gap-2 sm:grid-cols-3">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            const disabled = t.id === 'manual' && !hasManual
            return (
              <button
                key={t.id}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setTab(t.id)}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-2xl p-3.5 text-start ring-1 transition-colors',
                  active
                    ? 'bg-red-500/15 ring-red-500/40 text-white'
                    : 'bg-white/[0.03] ring-white/[0.08] text-white/70 hover:bg-white/[0.06]',
                  disabled && 'cursor-not-allowed opacity-40 hover:bg-white/[0.03]',
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="h-4 w-4 shrink-0" />
                  {t.short}
                </span>
                <span className="text-[11px] leading-snug text-white/45">{t.description}</span>
              </button>
            )
          })}
        </div>

        <div className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.08] sm:p-5">
          {tab === 'moviezone' && (
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/50">
                Direct download servers
              </h2>
              <MoviezoneDownloadLinks
                tmdbId={tmdbId}
                kind={kind}
                season={season}
                episode={episode}
              />
            </div>
          )}

          {tab === 'manual' && (
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/50">
                Manual download links
              </h2>
              {kind === 'movie' && movieManual && (
                <ManualMoviesDownloadLinks entry={movieManual} />
              )}
              {kind === 'tv' && seriesManual && (
                <ManualSeriesDownloadLinks entry={seriesManual} />
              )}
              {!hasManual && (
                <p className="py-8 text-center text-sm text-white/55">
                  No manual download links available for this title yet.
                </p>
              )}
            </div>
          )}

          {tab === 'torrent' && (
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/50">
                Torrent downloads
              </h2>
              <TorrentDownloadPanel query={torrentQuery} title={title} />
            </div>
          )}
        </div>

        <p className="mt-10 text-center text-xs text-white/30">
          Links open third-party sites or magnet clients. Use at your own risk.
        </p>
      </div>
    </div>
  )
}
