'use client'

/**
 * Xilfflix-style provider detail: media-type toggle + infinite scroll (swipe/scroll up loads more).
 * No previous/next pagination.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Film, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PosterCard from '@/src/components/PosterCard'
import { cardProps } from '@/src/lib/card-props'
import { GRID_CLASS, EmptyState } from '@/src/components/MediaGrid'
import {
  type ProviderItem,
  TMDB_LOGO_BASE,
} from '@/src/lib/providers'

type MediaType = 'movie' | 'tv'

type TmdbItem = {
  id: number
  title?: string
  name?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  release_date?: string
  first_air_date?: string
  genre_ids?: number[]
  overview?: string
  adult?: boolean
}

async function fetchProviderPage(
  providerId: number,
  mediaType: MediaType,
  page: number,
): Promise<{ results: TmdbItem[]; hasMore: boolean; totalPages: number }> {
  const res = await fetch(
    `/api/providers/content?providerId=${providerId}&type=${mediaType}&page=${page}`,
  )
  if (!res.ok) {
    return { results: [], hasMore: false, totalPages: 0 }
  }
  const data = await res.json()
  return {
    results: data.results ?? [],
    hasMore: Boolean(data.hasMore),
    totalPages: data.totalPages ?? 0,
  }
}

export default function ProviderExploreClient({ provider }: { provider: ProviderItem }) {
  const router = useRouter()
  const [mediaType, setMediaType] = useState<MediaType>('movie')
  const [items, setItems] = useState<TmdbItem[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  // Scroll to top when provider or media type changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [provider.id, mediaType])

  // Reset & load page 1 when media type changes
  useEffect(() => {
    let active = true
    loadingRef.current = true
    setLoading(true)
    setItems([])
    setPage(1)
    setHasMore(true)

    fetchProviderPage(provider.tmdbId, mediaType, 1)
      .then((res) => {
        if (!active) return
        setItems(res.results)
        setHasMore(res.results.length > 0 && res.hasMore)
        setLoading(false)
        loadingRef.current = false
      })
      .catch(() => {
        if (!active) return
        setHasMore(false)
        setLoading(false)
        loadingRef.current = false
      })

    return () => {
      active = false
    }
  }, [provider.tmdbId, mediaType])

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setLoading(true)
    const nextPage = page + 1

    fetchProviderPage(provider.tmdbId, mediaType, nextPage)
      .then((res) => {
        if (res.results.length === 0) {
          setHasMore(false)
        } else {
          setItems((prev) => {
            const existing = new Set(prev.map((m) => m.id))
            return [...prev, ...res.results.filter((m) => !existing.has(m.id))]
          })
          setPage(nextPage)
          if (!res.hasMore) setHasMore(false)
        }
        setLoading(false)
        loadingRef.current = false
      })
      .catch(() => {
        setHasMore(false)
        setLoading(false)
        loadingRef.current = false
      })
  }, [hasMore, page, provider.tmdbId, mediaType])

  // IntersectionObserver sentinel — same pattern as Xilfflix ProviderPage
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '0px 0px 400px 0px' },
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [loadMore, hasMore, loading])

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-24">
      {/* Soft provider-tinted ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, ${provider.glowColor} 0%, transparent 55%),
            radial-gradient(ellipse 60% 40% at 80% 20%, ${provider.glowColor} 0%, transparent 50%)
          `,
          opacity: 0.55,
        }}
      />

      {/* Back + brand header */}
      <div className="page-x page-top">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-white/55 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </button>

        <div className="mb-6 flex items-center gap-4 sm:gap-5">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[22px] shadow-2xl ring-1 ring-white/15 sm:h-20 sm:w-20 sm:rounded-[28px]"
            style={{ backgroundColor: provider.bgColor }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${TMDB_LOGO_BASE}${provider.logoPath}`}
              alt=""
              className="h-full w-full object-contain p-2.5"
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-[clamp(28px,4.5vw,48px)] font-extrabold leading-[0.95] text-white">
              {provider.name}
            </h1>
            <p className="mt-2 max-w-[55ch] text-[14px] text-white/50 sm:text-[15px]">
              {provider.tagline}
            </p>
          </div>
        </div>

        {/* Movies / TV segmented control — Xilfflix style */}
        <div className="mb-2 flex">
          <nav
            className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1"
            aria-label="Media type"
          >
            {([
              { key: 'movie' as const, label: 'Movies' },
              { key: 'tv' as const, label: 'TV Shows' },
            ]).map(({ key, label }) => {
              const isActive = mediaType === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMediaType(key)}
                  aria-pressed={isActive}
                  className={`relative rounded-full px-5 py-1.5 text-xs font-semibold transition-colors sm:px-6 sm:py-2 sm:text-sm ${
                    isActive ? 'text-zinc-950' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="providerTabCapsule"
                      className="absolute inset-0 rounded-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
                      transition={{ type: 'spring', stiffness: 450, damping: 35, mass: 0.8 }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content grid */}
      <div className="page-x mt-6 sm:mt-8">
        {items.length > 0 ? (
          <div className={GRID_CLASS}>
            {items.map((item, i) => {
              const props = cardProps(item, mediaType)
              return (
                <motion.div
                  key={`${mediaType}-${item.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.4) }}
                >
                  <PosterCard
                    {...props}
                    voteAverage={item.vote_average || 0}
                  />
                </motion.div>
              )
            })}
          </div>
        ) : !loading ? (
          <EmptyState
            title="Nothing here yet"
            icon={<Film className="h-6 w-6" aria-hidden />}
          >
            No {mediaType === 'tv' ? 'TV shows' : 'movies'} found for {provider.name} right now.
          </EmptyState>
        ) : null}

        {/* Initial loading skeleton strip */}
        {loading && items.length === 0 && (
          <div className={GRID_CLASS}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] animate-pulse rounded-xl bg-white/[0.06]"
              />
            ))}
          </div>
        )}

        {/* Infinite-scroll sentinel + bottom loader (swipe/scroll up loads more) */}
        <div ref={sentinelRef} className="flex h-16 items-center justify-center pt-6">
          <AnimatePresence>
            {loading && items.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-sm text-white/45"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading more…
              </motion.div>
            )}
            {!loading && !hasMore && items.length > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-white/35"
              >
                You’re all caught up
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Quick link back to all providers */}
      <div className="page-x mt-4 text-center">
        <Link
          href="/exploreworld"
          className="text-sm text-white/40 transition-colors hover:text-white/70"
        >
          ← All providers
        </Link>
      </div>
    </div>
  )
}
