'use client'

import React, { useState } from 'react'
import { Download } from 'lucide-react'
import { cn } from '@/src/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/src/components/ui/dialog'
import { fetchManualDownloads } from '@/src/app/actions/manual-downloads'
import type { ManualDownloadEntry } from '@/src/data/manual-downloads'
import ManualDownloadLinks from '@/src/components/detail/ManualDownloadLinks'
import { BrandLoader } from '@/src/components/brand/BrandMark'
import Link from 'next/link'

type Props = {
  tmdbId: number | string
  title?: string
  className?: string
  /** When true, also offer a link to the full /download2 page */
  showFullPageLink?: boolean
}

/**
 * Theatre-mode / detail-page Download control that opens manual links
 * (keyed by TMDB ID) in a dialog. Falls back gracefully when no manual
 * entry exists. Also links to the dedicated Download 2 page.
 */
export default function TheatreDownloadButton({
  tmdbId,
  title,
  className,
  showFullPageLink = true,
}: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [entry, setEntry] = useState<ManualDownloadEntry | null | undefined>(undefined)

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next && entry === undefined && !loading) {
      setLoading(true)
      fetchManualDownloads(tmdbId)
        .then(setEntry)
        .catch(() => setEntry(null))
        .finally(() => setLoading(false))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'pressable inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-white/[0.1] px-3.5 text-[13px] font-medium text-white outline-none transition-colors hover:bg-white/[0.16] focus-visible:ring-2 focus-visible:ring-red-500',
            className,
          )}
        >
          <Download aria-hidden className="h-4 w-4" />
          Download
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate pe-10 font-display text-2xl font-bold" dir="auto">
            {title ?? 'Downloads'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <BrandLoader tone="brand" className="h-9 w-9" />
          </div>
        ) : entry ? (
          <>
            <ManualDownloadLinks entry={entry} compact />
            {showFullPageLink && (
              <div className="mt-6 border-t border-white/10 pt-4 text-center">
                <Link
                  href={`/download2/${tmdbId}`}
                  className="text-sm text-red-400 hover:underline"
                >
                  Open full Download page →
                </Link>
              </div>
            )}
          </>
        ) : (
          <p className="py-10 text-center text-sm text-white/55">
            No manual download links available for this title yet.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
