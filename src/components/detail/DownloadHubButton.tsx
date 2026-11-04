'use client'

import React from 'react'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { cn } from '@/src/lib/utils'

type Props = {
  tmdbId: number | string
  kind: 'movie' | 'tv'
  /** For TV episodes — forwarded so Moviezone + torrent sections can target the right ep */
  season?: number
  episode?: number
  className?: string
  /** Optional label override (default: "Download") */
  label?: string
}

/**
 * Single Download button on the player / detail page.
 * Navigates to /download2/<tmdbId>?type=movie|tv&s=&e= where the user
 * picks Download 1 (Moviezone servers), Download 2 (manual), or Download 3 (torrent).
 */
export default function DownloadHubButton({
  tmdbId,
  kind,
  season,
  episode,
  className,
  label = 'Download',
}: Props) {
  const params = new URLSearchParams()
  params.set('type', kind)
  if (kind === 'tv') {
    if (season != null) params.set('s', String(season))
    if (episode != null) params.set('e', String(episode))
  }
  const href = `/download2/${tmdbId}?${params.toString()}`

  return (
    <Link
      href={href}
      className={cn(
        'pressable inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-white/[0.1] px-3.5 text-[13px] font-medium text-white outline-none transition-colors hover:bg-white/[0.16] focus-visible:ring-2 focus-visible:ring-red-500',
        className,
      )}
    >
      <Download aria-hidden className="h-4 w-4" />
      {label}
    </Link>
  )
}
