'use client'

/**
 * Infinite-scroll grid for /exploreworld/[id] — loads more titles as the user scrolls,
 * matching the Xilfflix provider page behaviour (no next/previous buttons).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import MediaGrid, { EmptyState } from '@/src/components/MediaGrid'

type Kind = 'movie' | 'tv'

interface ProviderInfiniteGridProps {
  providerId: string
  kind: Kind
  initialItems: any[]
  initialTotalPages: number
  failed?: boolean
  emptyLabel: string
}

export default function ProviderInfiniteGrid({
  providerId,
  kind,
  initialItems,
  initialTotalPages,
  failed = false,
  emptyLabel,
}: ProviderInfiniteGridProps) {
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialTotalPages > 1 && initialItems.length > 0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  // Avoid stale closures / double-fetches
  const loadingRef = useRef(false)
  const pageRef = useRef(1)

  // Reset when provider or type changes (server re-renders with new initial props)
  useEffect(() => {
    setItems(initialItems)
    setPage(1)
    pageRef.current = 1
    setTotalPages(initialTotalPages)
    setHasMore(initialTotalPages > 1 && initialItems.length > 0)
    setLoading(false)
    loadingRef.current = false
  }, [providerId, kind, initialItems, initialTotalPages])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setLoading(true)

    const nextPage = pageRef.current + 1
    try {
      const res = await fetch(
        `/api/provider-content?id=${encodeURIComponent(providerId)}&type=${kind}&page=${nextPage}`,
        { cache: 'no-store' },
      )
      if (!res.ok) {
        setHasMore(false)
        return
      }
      const data = await res.json()
      const nextResults: any[] = data.results ?? []
      const nextTotal: number = data.totalPages ?? totalPages

      if (nextResults.length === 0) {
        setHasMore(false)
      } else {
        setItems((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          return [...prev, ...nextResults.filter((m) => !seen.has(m.id))]
        })
        pageRef.current = nextPage
        setPage(nextPage)
        setTotalPages(nextTotal)
        if (nextPage >= nextTotal) setHasMore(false)
      }
    } catch {
      setHasMore(false)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [hasMore, providerId, kind, totalPages])

  // IntersectionObserver sentinel — same pattern as Xilfflix
  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '400px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loadMore, hasMore, loading])

  if (failed) {
    return (
      <EmptyState title="Couldn’t load titles">
        Try again in a moment.
      </EmptyState>
    )
  }

  if (items.length === 0 && !loading) {
    return (
      <EmptyState title="Nothing here yet">
        {emptyLabel}
      </EmptyState>
    )
  }

  return (
    <>
      <MediaGrid items={items} kind={kind} />

      {/* Loading indicator while fetching the next page */}
      {loading && (
        <div className="mt-8 flex justify-center py-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
        </div>
      )}

      {/* Infinite-scroll sentinel */}
      <div ref={sentinelRef} className="h-16 w-full" aria-hidden />
    </>
  )
}
