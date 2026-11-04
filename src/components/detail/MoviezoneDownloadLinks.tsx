'use client'

import React, { useState } from 'react'
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/src/lib/utils'
import {
  MOVIEZONE_SERVERS,
  moviezoneLink,
  type MoviezoneServer,
} from '@/src/lib/moviezone-downloads'

type Props = {
  tmdbId: string | number
  kind: 'movie' | 'tv'
  season?: number
  episode?: number
  /** Optional episode list for TV stepper: { n, name }[] */
  episodes?: { n: number; name?: string }[]
  className?: string
}

function ServerRow({
  server,
  href,
}: {
  server: MoviezoneServer
  href: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="pressable group flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.08] hover:ring-white/[0.14]"
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-bold text-white"
        style={{
          background: `linear-gradient(135deg, ${server.gradientFrom}, ${server.gradientTo})`,
        }}
      >
        {server.tag}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
          {server.name}
          {server.flag && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              {server.flag}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-white/55">{server.note}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {server.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/60"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-white/35 transition-colors group-hover:text-white/70" />
    </a>
  )
}

/**
 * Download 1 — Moviezone / Olly Embed server list.
 * Opens each server in a new tab (same roster as moviezone downloads.js).
 */
export default function MoviezoneDownloadLinks({
  tmdbId,
  kind,
  season = 1,
  episode = 1,
  episodes = [],
  className,
}: Props) {
  const [ep, setEp] = useState(episode)
  const isTv = kind === 'tv'

  const sortedEps =
    episodes.length > 0
      ? [...episodes].sort((a, b) => a.n - b.n)
      : [{ n: ep, name: '' }]

  const idx = sortedEps.findIndex((e) => e.n === ep)
  const current = idx >= 0 ? sortedEps[idx] : { n: ep, name: '' }

  const go = (delta: number) => {
    if (sortedEps.length === 0) {
      setEp(Math.max(1, ep + delta))
      return
    }
    const next = idx + delta
    if (next < 0 || next >= sortedEps.length) return
    setEp(sortedEps[next].n)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {isTv && (
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-2 ring-1 ring-white/[0.08]">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={idx <= 0 && episodes.length > 0}
            className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.06] text-white transition hover:bg-white/[0.12] disabled:opacity-30"
            aria-label="Previous episode"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 text-center text-sm text-white/75">
            <span className="font-semibold text-amber-400">
              S{season}:E{current.n}
            </span>
            {current.name ? (
              <span className="ms-1.5 truncate text-white/55">· {current.name}</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={idx >= sortedEps.length - 1 && episodes.length > 0}
            className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.06] text-white transition hover:bg-white/[0.12] disabled:opacity-30"
            aria-label="Next episode"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <ul className="space-y-2.5">
        {MOVIEZONE_SERVERS.map((server) => (
          <li key={server.tag}>
            <ServerRow
              server={server}
              href={moviezoneLink(server, {
                kind,
                tmdbId,
                season,
                episode: ep,
              })}
            />
          </li>
        ))}
      </ul>

      <p className="text-xs text-white/40">
        Each server opens in a new tab. Some ask for a quick human check first — if one is
        slow or busy, try the next.
      </p>
    </div>
  )
}
