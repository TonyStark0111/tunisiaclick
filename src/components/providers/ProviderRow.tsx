'use client'

/**
 * Browse by Provider horizontal row — adapted from Xilfflix ProviderRow for Next.js.
 * Uses next/link instead of react-router navigate.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { PROVIDERS_LIST, TMDB_LOGO_BASE, type ProviderItem } from '@/src/lib/providers'

const EDGE_ZONE = 110

interface ProviderRowProps {
  className?: string
  title?: string
  /** Base path for provider detail links (default /exploreworld) */
  basePath?: string
  providers?: ProviderItem[]
}

export default function ProviderRow({
  className = '',
  title = 'Browse by Provider',
  basePath = '/exploreworld',
  providers = PROVIDERS_LIST,
}: ProviderRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)

  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const isAtStart = el.scrollLeft <= 10
    const isAtEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 10
    setCanScrollLeft(!isAtStart)
    setCanScrollRight(!isAtEnd)
    if (isAtStart) setShowLeft(false)
    if (isAtEnd) setShowRight(false)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = 0
    updateScrollState()
    if (!el) return
    const ro = new ResizeObserver(updateScrollState)
    ro.observe(el)
    return () => ro.disconnect()
  }, [updateScrollState, providers])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    const row = rowRef.current
    if (!row || !el) return

    const isAtStart = el.scrollLeft <= 10
    const isAtEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 10
    const { left, width } = row.getBoundingClientRect()
    const x = e.clientX - left

    setShowLeft(!isAtStart && x <= EDGE_ZONE)
    setShowRight(!isAtEnd && x >= width - EDGE_ZONE)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setShowLeft(false)
    setShowRight(false)
  }, [])

  const scroll = useCallback(
    (dir: 'left' | 'right') => {
      const el = scrollRef.current
      if (!el) return
      const scrollAmount = el.clientWidth * 0.75
      const target =
        dir === 'right'
          ? el.scrollLeft + scrollAmount
          : Math.max(0, el.scrollLeft - scrollAmount)
      el.scrollTo({ left: target, behavior: 'smooth' })
      setTimeout(updateScrollState, 450)
    },
    [updateScrollState],
  )

  return (
    <div className={`relative select-none ${className}`}>
      <h2 className="page-x mb-3.5 font-display text-lg font-bold tracking-tight text-white sm:text-xl">
        {title}
      </h2>

      <div
        ref={rowRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative"
      >
        <AnimatePresence>
          {showLeft && canScrollLeft && (
            <motion.button
              key="left-arrow"
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              className="absolute left-2 top-[36px] z-30 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center border-0 bg-transparent text-white outline-none transition-transform duration-150 hover:scale-110 active:scale-90 sm:left-4 sm:top-[42px] sm:h-10 sm:w-10 md:top-[46px]"
            >
              <ChevronLeft
                className="h-6 w-6 stroke-white text-white sm:h-7 sm:w-7"
                style={{
                  filter:
                    'drop-shadow(0 2px 6px rgba(0,0,0,0.95)) drop-shadow(0 0 3px rgba(0,0,0,0.9))',
                }}
                strokeWidth={2.8}
              />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showRight && canScrollRight && (
            <motion.button
              key="right-arrow"
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              className="absolute right-2 top-[36px] z-30 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center border-0 bg-transparent text-white outline-none transition-transform duration-150 hover:scale-110 active:scale-90 sm:right-4 sm:top-[42px] sm:h-10 sm:w-10 md:top-[46px]"
            >
              <ChevronRight
                className="h-6 w-6 stroke-white text-white sm:h-7 sm:w-7"
                style={{
                  filter:
                    'drop-shadow(0 2px 6px rgba(0,0,0,0.95)) drop-shadow(0 0 3px rgba(0,0,0,0.9))',
                }}
                strokeWidth={2.8}
              />
            </motion.button>
          )}
        </AnimatePresence>

        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex items-start gap-6 overflow-x-auto scroll-smooth py-2 sm:gap-7 md:gap-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {providers.map((provider, index) => (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.02 }}
              className={`group/card flex w-[72px] flex-shrink-0 flex-col items-center sm:w-[84px] md:w-[92px] ${
                index === 0 ? 'ml-4 sm:ml-8 lg:ml-12' : ''
              } ${index === providers.length - 1 ? 'mr-4 sm:mr-8 lg:mr-12' : ''}`}
            >
              <Link
                href={`${basePath}/${provider.id}`}
                className="flex w-full flex-col items-center outline-none"
                aria-label={`Browse ${provider.name}`}
              >
                <div
                  className="relative h-[72px] w-[72px] overflow-hidden rounded-[18px] transition-all duration-300 ease-out group-hover/card:-translate-y-1 group-hover/card:scale-105 sm:h-[84px] sm:w-[84px] sm:rounded-[22px] md:h-[92px] md:w-[92px] md:rounded-[24px]"
                  style={{
                    backgroundColor: provider.bgColor,
                    boxShadow: `0 4px 14px rgba(0,0,0,0.6), 0 0 0 0 transparent`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.55), 0 0 20px ${provider.glowColor}`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.6)'
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${TMDB_LOGO_BASE}${provider.logoPath}`}
                    alt=""
                    className="h-full w-full object-contain p-3 sm:p-3.5"
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget
                      img.style.display = 'none'
                      const parent = img.parentElement
                      if (parent && !parent.querySelector('[data-fallback]')) {
                        const fallback = document.createElement('span')
                        fallback.dataset.fallback = '1'
                        fallback.className =
                          'absolute inset-0 flex items-center justify-center text-center text-[10px] font-bold text-white/90 px-1'
                        fallback.textContent = provider.name
                        parent.appendChild(fallback)
                      }
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/15" />
                </div>

                <span className="mt-2.5 line-clamp-2 w-full px-0.5 text-center text-[11px] font-medium leading-tight text-[#a3a3a3] transition-colors duration-200 group-hover/card:text-white sm:text-xs">
                  {provider.name}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
