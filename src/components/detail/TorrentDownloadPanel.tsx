'use client'

import React, { useEffect, useState } from 'react'
import { Download, Sprout } from 'lucide-react'
import { getDownloads, type DownloadQuery } from '@/src/app/actions/downloads'
import type { DownloadOption } from '@/src/lib/downloads'
import { BrandLoader } from '@/src/components/brand/BrandMark'
import { toast } from '@/src/hooks/use-toast'
import { useT } from '@/src/components/I18nProvider'

type Props = {
  query: DownloadQuery | null
  title: string
}

/**
 * Download 3 — torrent magnets (YTS / EZTV / Torrentio), same data as the old DownloadDialog.
 */
export default function TorrentDownloadPanel({ query, title }: Props) {
  const t = useT()
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<DownloadOption[] | null>(null)

  useEffect(() => {
    if (!query?.imdbId) {
      setOptions([])
      return
    }
    let cancelled = false
    setLoading(true)
    setOptions(null)
    getDownloads(query)
      .then((list) => {
        if (!cancelled) setOptions(list)
      })
      .catch(() => {
        if (!cancelled) setOptions([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query?.imdbId, query && 'season' in query ? query.season : 0, query && 'episode' in query ? query.episode : 0])

  if (!query?.imdbId) {
    return (
      <p className="py-8 text-center text-sm text-white/55">
        No IMDb id for this title — torrent search is unavailable.
      </p>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <BrandLoader tone="brand" className="h-9 w-9" />
      </div>
    )
  }

  if (!options || options.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/55">{t('download.none')}</p>
    )
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {options.map((option, index) => (
          <li key={`${option.magnet.slice(0, 60)}-${index}`}>
            <a
              href={option.magnet}
              onClick={() =>
                toast({ title: t('download.opening'), description: option.label, duration: 3000 })
              }
              className="pressable flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3.5 ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.09]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-500/15 text-red-400">
                <Download aria-hidden className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" dir="auto">
                  {option.label}
                </p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-white/50">
                  <span>{option.source}</span>
                  {option.size && <span>{option.size}</span>}
                  {typeof option.seeds === 'number' && (
                    <span className="inline-flex items-center gap-1">
                      <Sprout aria-hidden className="h-3.5 w-3.5 text-emerald-400" />
                      {option.seeds}
                    </span>
                  )}
                </p>
              </div>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-white/40">{t('download.disclaimer')}</p>
    </div>
  )
}
