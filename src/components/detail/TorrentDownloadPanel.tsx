'use client'

import React, { useEffect, useState } from 'react'
import { Download, Info } from 'lucide-react'
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
 * Download 3 — Chillax-style torrent download feature.
 * Shows quality buttons (e.g. 1080p.WEB). Prefer direct .torrent file download when the
 * index provides a URL (YTS); otherwise open the magnet in the user's torrent client.
 * Data still comes from YTS + Torrentio (movies) / EZTV + Torrentio (TV).
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
  }, [
    query?.imdbId,
    query && 'season' in query ? query.season : 0,
    query && 'episode' in query ? query.episode : 0,
  ])

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
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 text-center">
        <Info className="mx-auto mb-2 h-5 w-5 text-white/40" />
        <p className="text-sm text-white/55">{t('download.none')}</p>
      </div>
    )
  }

  const openMagnet = (option: DownloadOption) => {
    if (!option.magnet) {
      toast({ title: t('download.none'), duration: 3000 })
      return
    }
    toast({
      title: t('download.opening'),
      description: option.label,
      duration: 3000,
    })
    window.location.href = option.magnet
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => {
          const details = [
            option.size,
            typeof option.seeds === 'number' ? `${option.seeds} seeds` : null,
            option.source,
          ]
            .filter(Boolean)
            .join(' · ')
          const key = `${option.magnet.slice(0, 40)}-${index}`
          const hasFile = Boolean(option.url)

          if (hasFile && option.url) {
            return (
              <a
                key={key}
                href={option.url}
                rel="noopener noreferrer"
                title={`Download ${option.label} .torrent${details ? ` (${details})` : ''}`}
                onClick={() =>
                  toast({
                    title: t('download.opening'),
                    description: `${option.label} (.torrent)`,
                    duration: 3000,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.06] px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-red-500/60 hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {option.label}
              </a>
            )
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => openMagnet(option)}
              title={`Open ${option.label} in your torrent client${details ? ` (${details})` : ''}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.06] px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-red-500/60 hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {option.label}
            </button>
          )
        })}
      </div>

      <p className="text-xs leading-relaxed text-white/40">
        {t('download.disclaimer') ||
          'YTS entries download a .torrent file. Other sources open a magnet link in your torrent client. Use at your own risk.'}
      </p>
    </div>
  )
}
