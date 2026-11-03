'use client'

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import type { CatalogTitle, UniverseAccent, UniverseMeta } from '@/src/lib/universes'
import '@/src/styles/universe-detail.css'

type TimelineItem = CatalogTitle & {
  media_type: 'movie' | 'tv'
  _releaseOrder?: number
}

type Filter = 'all' | 'movies' | 'tv' | 'upcoming'
type Sort = 'release' | 'rating' | 'title'

const SVG_PLAY = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
)
const SVG_CLOCK = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)
const SVG_DOWN = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 5v14M5 12l7 7 7-7" />
  </svg>
)

function dateOf(item: TimelineItem) {
  return item.release_date || item.first_air_date || ''
}

function isUpcoming(item: TimelineItem, today: string) {
  const d = dateOf(item)
  return !d || d > today
}

function titleOf(item: TimelineItem) {
  return item.title || item.name || 'Untitled'
}

function yearOf(item: TimelineItem) {
  return dateOf(item).slice(0, 4) || 'TBA'
}

export default function UniverseDetailClient({
  universe,
  timeline,
  accentRgb,
}: {
  universe: UniverseMeta
  timeline: TimelineItem[]
  accentRgb: string
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('release')
  const heroRef = useRef<HTMLDivElement>(null)
  const gridMetaRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  const allItems = useMemo(() => {
    return timeline.map((item, i) => ({ ...item, _releaseOrder: i }))
  }, [timeline])

  const movies = useMemo(() => allItems.filter((i) => i.media_type === 'movie'), [allItems])
  const tvSeries = useMemo(() => allItems.filter((i) => i.media_type === 'tv'), [allItems])
  const upcomingItems = useMemo(
    () => allItems.filter((i) => isUpcoming(i, today)),
    [allItems, today]
  )
  const releasedCount = allItems.length - upcomingItems.length

  const yearStart = yearOf(allItems[0] || ({} as TimelineItem)) || '?'
  const yearEnd = yearOf(allItems[allItems.length - 1] || ({} as TimelineItem)) || 'Present'
  const heroItem = allItems.find((m) => m.backdrop_path) || allItems[0]
  const firstUp = allItems.find((i) => !isUpcoming(i, today))

  const filtered = useMemo(() => {
    let list = allItems
    if (filter === 'movies') list = movies
    else if (filter === 'tv') list = tvSeries
    else if (filter === 'upcoming') list = upcomingItems

    const sorted = [...list]
    if (sort === 'rating') {
      sorted.sort((a, b) => (Number(b.vote_average) || 0) - (Number(a.vote_average) || 0))
    } else if (sort === 'title') {
      sorted.sort((a, b) => titleOf(a).localeCompare(titleOf(b)))
    } else {
      sorted.sort((a, b) => (a._releaseOrder ?? 0) - (b._releaseOrder ?? 0))
    }
    return sorted
  }, [allItems, filter, sort, movies, tvSeries, upcomingItems])

  const sortLabel =
    sort === 'rating' ? 'Top rated first' : sort === 'title' ? 'A – Z' : 'Release order'

  // Ken Burns on hero
  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const id = requestAnimationFrame(() => el.classList.add('ch-kenburns'))
    return () => cancelAnimationFrame(id)
  }, [])

  const scrollToGrid = useCallback(() => {
    toolbarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.classList.add('ch-img-in')
  }

  if (!allItems.length) {
    return (
      <div className="universe-detail page-y">
        <div className="px-4 py-20 text-center text-white/50">
          No titles listed for this universe yet.
        </div>
        <Link href="/universes" className="ch-back">
          ← All cinematic universes
        </Link>
      </div>
    )
  }

  return (
    <div
      className={`universe-detail ch-accent-${universe.accent}`}
      style={{ ['--ch-acc' as string]: accentRgb }}
    >
      {/* Hero */}
      <div ref={heroRef} className={`ch-detail-hero ch-accent-${universe.accent}`}>
        {heroItem?.backdrop_path && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://image.tmdb.org/t/p/w1280${heroItem.backdrop_path}`}
            srcSet={`https://image.tmdb.org/t/p/w780${heroItem.backdrop_path} 780w, https://image.tmdb.org/t/p/w1280${heroItem.backdrop_path} 1280w`}
            sizes="100vw"
            alt=""
            width={1280}
            height={720}
            fetchPriority="high"
            decoding="async"
            className="ch-detail-hero-img"
          />
        )}
        <div className="ch-detail-hero-gradient" />
        <div className="ch-detail-hero-content">
          <span className="ch-card-badge">{universe.badge}</span>
          <h1>{universe.name}</h1>
          <p>{universe.tagline}</p>
          <div className="ch-detail-meta">
            <span className="ch-detail-count">
              {movies.length} Movie{movies.length !== 1 ? 's' : ''}
            </span>
            {tvSeries.length > 0 && (
              <span className="ch-detail-count">
                {tvSeries.length} TV Series
              </span>
            )}
            <span className="ch-detail-count">
              {yearStart} – {yearEnd}
            </span>
            {upcomingItems.length > 0 && (
              <span className="ch-detail-count ch-detail-count--soon">
                {releasedCount} of {allItems.length} released
              </span>
            )}
          </div>
          <div className="ch-hero-actions">
            {firstUp && (
              <Link
                href={firstUp.media_type === 'tv' ? `/tv/${firstUp.id}` : `/movie/${firstUp.id}`}
                className="ch-hero-cta"
              >
                {SVG_PLAY}
                <span>
                  Start with <b>{titleOf(firstUp)}</b>
                </span>
              </Link>
            )}
            <button type="button" className="ch-hero-ghost" onClick={scrollToGrid}>
              {SVG_DOWN}
              All {allItems.length} titles
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="ch-toolbar" ref={toolbarRef}>
        <div className="ch-detail-tabs" role="group" aria-label="Show">
          <button
            type="button"
            className={`ch-dtab${filter === 'all' ? ' active' : ''}`}
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            All <b>{allItems.length}</b>
          </button>
          <button
            type="button"
            className={`ch-dtab${filter === 'movies' ? ' active' : ''}`}
            aria-pressed={filter === 'movies'}
            onClick={() => setFilter('movies')}
          >
            Movies <b>{movies.length}</b>
          </button>
          {tvSeries.length > 0 && (
            <button
              type="button"
              className={`ch-dtab${filter === 'tv' ? ' active' : ''}`}
              aria-pressed={filter === 'tv'}
              onClick={() => setFilter('tv')}
            >
              TV Series <b>{tvSeries.length}</b>
            </button>
          )}
          {upcomingItems.length > 0 && (
            <button
              type="button"
              className={`ch-dtab${filter === 'upcoming' ? ' active' : ''}`}
              aria-pressed={filter === 'upcoming'}
              onClick={() => setFilter('upcoming')}
            >
              Upcoming <b>{upcomingItems.length}</b>
            </button>
          )}
        </div>
        <div className="ch-detail-sort" role="group" aria-label="Sort by">
          <button
            type="button"
            className={`ch-sort-btn${sort === 'release' ? ' active' : ''}`}
            aria-pressed={sort === 'release'}
            onClick={() => setSort('release')}
          >
            Release Order
          </button>
          <button
            type="button"
            className={`ch-sort-btn${sort === 'rating' ? ' active' : ''}`}
            aria-pressed={sort === 'rating'}
            onClick={() => setSort('rating')}
          >
            Top Rated
          </button>
          <button
            type="button"
            className={`ch-sort-btn${sort === 'title' ? ' active' : ''}`}
            aria-pressed={sort === 'title'}
            onClick={() => setSort('title')}
          >
            A – Z
          </button>
        </div>
      </div>

      <div className="ch-grid-meta" ref={gridMetaRef} aria-live="polite">
        <b>{filtered.length}</b> title{filtered.length !== 1 ? 's' : ''} · {sortLabel}
      </div>

      {/* Grid */}
      <div className="ch-movie-grid" id="chMovieGrid">
        {filtered.map((item, idx) => {
          const title = titleOf(item)
          const year = yearOf(item)
          const voteRaw = Number(item.vote_average || 0)
          const rating = voteRaw.toFixed(1)
          const isTVItem = item.media_type === 'tv'
          const soon = isUpcoming(item, today)
          const delay = Math.min(idx, 16) * 45
          const order = String((item._releaseOrder ?? idx) + 1).padStart(2, '0')
          const href = isTVItem ? `/tv/${item.id}` : `/movie/${item.id}`

          return (
            <Link
              key={`${item.media_type}-${item.id}`}
              href={href}
              className={`ch-movie-card${soon ? ' ch-movie-soon' : ''}`}
              style={{ ['--delay' as string]: `${delay}ms`, animationDelay: `${delay}ms` }}
            >
              <div className="ch-movie-card-inner">
                {item.poster_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                    alt={title}
                    width={342}
                    height={513}
                    loading={idx < 12 ? 'eager' : 'lazy'}
                    decoding="async"
                    onLoad={onImgLoad}
                  />
                ) : (
                  <div className="ch-movie-noart">{order}</div>
                )}
                <span className="ch-movie-order" aria-hidden="true">
                  {order}
                </span>
                {isTVItem ? (
                  <span className="ch-movie-type-badge ch-type-tv">SERIES</span>
                ) : (
                  <span className="ch-movie-type-badge ch-type-movie">MOVIE</span>
                )}
                {soon ? (
                  <div className="ch-movie-soon-chip">UPCOMING</div>
                ) : voteRaw > 0 ? (
                  <div className="ch-movie-rating">★ {rating}</div>
                ) : null}
                <div className="ch-movie-shine" />
                <div className="ch-movie-hover-overlay">
                  <div className="ch-movie-hover-play">{soon ? SVG_CLOCK : SVG_PLAY}</div>
                </div>
              </div>
              <div className="ch-movie-info">
                <h4>{title}</h4>
                <span>
                  {year} · {isTVItem ? 'Series' : 'Movie'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      <Link href="/universes" className="ch-back">
        ← All cinematic universes
      </Link>
    </div>
  )
}
