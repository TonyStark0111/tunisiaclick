"use client"
// Photo gallery for the Extras section: TMDB backdrops and posters with a lightbox,
// keyboard navigation, and optional download. Ported from meowly Photos tab.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { ChevronLeft, ChevronRight, Download, Loader2, CheckCircle2, X } from 'lucide-react'
import TmdbImage from '@/src/components/TmdbImage'
import { SectionHeader } from '@/src/components/rows/Row'
import { useI18n } from '@/src/components/I18nProvider'
import { tween } from '@/src/lib/motion'
import { tmdbImageUrl } from '@/src/lib/tmdb-image'
import type { TKey } from '@/src/lib/i18n'

export type GalleryImage = { file_path: string }

type ActivePhoto = { type: 'backdrop' | 'poster'; index: number; file_path: string }

type DownloadStatus = 'idle' | 'downloading' | 'success' | 'fallback'

export default function PhotosGallery({
  backdrops = [],
  posters = [],
  title,
}: {
  backdrops?: GalleryImage[]
  posters?: GalleryImage[]
  title: string
}) {
  const { t } = useI18n()
  const [activePhoto, setActivePhoto] = useState<ActivePhoto | null>(null)
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle')

  const posterList = useMemo(() => posters.slice(0, 18), [posters])
  const hasPhotos = backdrops.length > 0 || posterList.length > 0

  const photoList = useMemo(() => {
    if (!activePhoto) return [] as GalleryImage[]
    return activePhoto.type === 'backdrop' ? backdrops : posterList
  }, [activePhoto, backdrops, posterList])

  const hasPrev = activePhoto !== null && activePhoto.index > 0
  const hasNext = activePhoto !== null && activePhoto.index < photoList.length - 1

  const go = useCallback((dir: -1 | 1) => {
    if (!activePhoto) return
    const next = activePhoto.index + dir
    if (next < 0 || next >= photoList.length) return
    setActivePhoto({
      type: activePhoto.type,
      index: next,
      file_path: photoList[next].file_path,
    })
  }, [activePhoto, photoList])

  useEffect(() => {
    if (!activePhoto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActivePhoto(null)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activePhoto, go])

  useEffect(() => {
    if (downloadStatus === 'idle') return
    const delay = downloadStatus === 'fallback' ? 8000 : 4000
    const timer = setTimeout(() => setDownloadStatus('idle'), delay)
    return () => clearTimeout(timer)
  }, [downloadStatus])

  const handleDownload = async (filePath: string) => {
    setDownloadStatus('downloading')
    const url = tmdbImageUrl(filePath, 'backdrop', 1280) || `https://image.tmdb.org/t/p/original${filePath}`
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('fetch failed')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${title.replace(/[^\w\s-]/g, '').trim() || 'photo'}-${filePath.split('/').pop() || 'image.jpg'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(a.href)
      setDownloadStatus('success')
    } catch {
      // CORS / blocked: open the image so the user can save it manually.
      window.open(url, '_blank', 'noopener,noreferrer')
      setDownloadStatus('fallback')
    }
  }

  if (!hasPhotos) return null

  return (
    <div className="space-y-8">
      <SectionHeader title={<span id="extras-photos-title">{t('extras.photos' as TKey)}</span>} />

      {backdrops.length > 0 && (
        <div className="space-y-4">
          <h3 className="page-x text-sm font-semibold uppercase tracking-widest text-white/50">
            {t('extras.backdrops' as TKey)}
            <span className="ms-2 text-white/30">{backdrops.length}</span>
          </h3>
          <div className="page-x grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {backdrops.map((image, idx) => (
              <button
                key={`bd-${image.file_path}-${idx}`}
                type="button"
                className="group relative aspect-video overflow-hidden rounded-2xl border border-white/5 bg-white/[0.04] text-start shadow-xl transition hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                onClick={() => setActivePhoto({ type: 'backdrop', index: idx, file_path: image.file_path })}
                aria-label={t('extras.viewPhoto' as TKey, { n: idx + 1 })}
              >
                <TmdbImage
                  kind="backdrop"
                  path={image.file_path}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <span className="pointer-events-none absolute inset-0 bg-black/15 transition group-hover:bg-transparent" />
              </button>
            ))}
          </div>
        </div>
      )}

      {posterList.length > 0 && (
        <div className="space-y-4">
          <h3 className="page-x text-sm font-semibold uppercase tracking-widest text-white/50">
            {t('extras.posters' as TKey)}
            <span className="ms-2 text-white/30">{posterList.length}</span>
          </h3>
          <div className="page-x grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6">
            {posterList.map((image, idx) => (
              <button
                key={`pt-${image.file_path}-${idx}`}
                type="button"
                className="group relative aspect-[2/3] overflow-hidden rounded-xl border border-white/5 bg-white/[0.04] text-start shadow-lg transition hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                onClick={() => setActivePhoto({ type: 'poster', index: idx, file_path: image.file_path })}
                aria-label={t('extras.viewPhoto' as TKey, { n: idx + 1 })}
              >
                <TmdbImage
                  kind="poster"
                  path={image.file_path}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 33vw, 160px"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {activePhoto && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 md:p-8" role="dialog" aria-modal="true" aria-label={t('extras.photoViewer' as TKey)}>
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={tween.base}
              onClick={() => setActivePhoto(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />

            <div className="absolute end-4 top-4 z-[110] flex items-center gap-2 md:end-6 md:top-6 md:gap-3">
              <button
                type="button"
                onClick={() => handleDownload(activePhoto.file_path)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 md:px-4"
              >
                <Download className="h-4 w-4" />
                <span className="hidden md:inline">{t('extras.download' as TKey)}</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="rounded-full border border-white/10 bg-white/10 p-2.5 text-white backdrop-blur-md transition hover:bg-red-600/80"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {hasPrev && (
              <button
                type="button"
                onClick={() => go(-1)}
                className="absolute start-2 top-1/2 z-[110] -translate-y-1/2 rounded-full border border-white/10 bg-white/10 p-2 text-white backdrop-blur-md transition hover:bg-white/20 md:start-6 md:p-3"
                aria-label={t('extras.prevPhoto' as TKey)}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {hasNext && (
              <button
                type="button"
                onClick={() => go(1)}
                className="absolute end-2 top-1/2 z-[110] -translate-y-1/2 rounded-full border border-white/10 bg-white/10 p-2 text-white backdrop-blur-md transition hover:bg-white/20 md:end-6 md:p-3"
                aria-label={t('extras.nextPhoto' as TKey)}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            <m.div
              key={activePhoto.file_path}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={tween.base}
              className={`relative z-[105] max-h-[85vh] max-w-[95vw] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 ${
                activePhoto.type === 'poster' ? 'aspect-[2/3] w-full max-w-md' : 'aspect-video w-full max-w-5xl'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tmdbImageUrl(activePhoto.file_path, activePhoto.type === 'poster' ? 'poster' : 'backdrop', activePhoto.type === 'poster' ? 780 : 1280) || `https://image.tmdb.org/t/p/original${activePhoto.file_path}`}
                alt=""
                className="h-full w-full object-contain bg-black"
              />
            </m.div>

            <p className="relative z-[105] mt-4 text-sm text-white/50">
              {activePhoto.index + 1} / {photoList.length}
            </p>

            <AnimatePresence>
              {downloadStatus !== 'idle' && (
                <m.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  className="absolute bottom-6 start-1/2 z-[110] flex w-[min(92vw,360px)] -translate-x-1/2 items-start gap-3 rounded-2xl border border-white/10 bg-black/80 p-4 text-white shadow-2xl backdrop-blur-md"
                >
                  {downloadStatus === 'downloading' && (
                    <>
                      <span className="rounded-xl border border-white/10 bg-white/10 p-2"><Loader2 className="h-5 w-5 animate-spin" /></span>
                      <div>
                        <p className="text-sm font-semibold">{t('extras.downloading' as TKey)}</p>
                        <p className="text-xs text-white/60">{t('extras.downloadingText' as TKey)}</p>
                      </div>
                    </>
                  )}
                  {downloadStatus === 'success' && (
                    <>
                      <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/15 p-2 text-emerald-400"><CheckCircle2 className="h-5 w-5" /></span>
                      <div>
                        <p className="text-sm font-semibold">{t('extras.downloadDone' as TKey)}</p>
                        <p className="text-xs text-white/60">{t('extras.downloadDoneText' as TKey)}</p>
                      </div>
                    </>
                  )}
                  {downloadStatus === 'fallback' && (
                    <>
                      <span className="rounded-xl border border-amber-500/20 bg-amber-500/15 p-2 text-amber-400"><Download className="h-5 w-5" /></span>
                      <div>
                        <p className="text-sm font-semibold">{t('extras.downloadFallback' as TKey)}</p>
                        <p className="text-xs text-white/60">{t('extras.downloadFallbackText' as TKey)}</p>
                      </div>
                    </>
                  )}
                </m.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
