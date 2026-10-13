'use client'

import React from 'react'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { cn } from '@/src/lib/utils'

type Props = {
  tmdbId: number | string
  className?: string
}

/**
 * Separate "Download 2" button – opens the full manual-download page.
 * Looks identical in style to the existing Download button so the three
 * controls sit cleanly side-by-side:
 *   [ Theater mode ]  [ Download ]  [ Download 2 ]
 */
export default function Download2Button({ tmdbId, className }: Props) {
  return (
    <Link
      href={`/download2/${tmdbId}`}
      className={cn(
        'pressable inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-white/[0.1] px-3.5 text-[13px] font-medium text-white outline-none transition-colors hover:bg-white/[0.16] focus-visible:ring-2 focus-visible:ring-red-500',
        className,
      )}
    >
      <Download aria-hidden className="h-4 w-4" />
      Download 2
    </Link>
  )
}
