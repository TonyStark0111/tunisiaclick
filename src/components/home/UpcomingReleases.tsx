import Link from 'next/link'
import TmdbImage from '@/src/components/TmdbImage'
import FollowButton from '@/src/components/FollowButton'
import { genreNames } from '@/src/lib/genres'
import { getLocale, getT } from '@/src/lib/i18n/server'
import { formatDate } from '@/src/lib/i18n/format'
import { tunisToday } from '@/src/lib/pick-of-the-day'
const DAY = 86400000

type UpcomingItem = {
  id: number
  title?: string
  name?: string
  backdrop_path?: string | null
  poster_path?: string | null
  release_date?: string
  overview?: string
  genre_ids?: number[]
  original_language?: string
}

type Props = {
  items?: UpcomingItem[] | null
}

/**
 * UPCOMING RELEASES — MovieZone-style grid on the home page.
 * Exact card geometry: 185px 16:9 still + fixed info block (~370px total),
 * gold release badge, countdown, lang + genre chips, Notify Me, same info.
 */
export default function UpcomingReleases({ items }: Props) {
  if (!items?.length) return null

  const locale = getLocale()
  const t = getT()
  const today = tunisToday()

  // Soonest first, drop anything already out (or keep if no date)
  const movies = [...items]
    .filter((m) => m && (m.backdrop_path || m.poster_path) && (!m.release_date || m.release_date >= today))
    .sort((a, b) => (a.release_date ?? '').localeCompare(b.release_date ?? ''))
    .slice(0, 12)

  if (movies.length === 0) return null

  const relative = (date: string) => {
    const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY)
    if (days === 0) return 'Releasing TODAY!'
    if (days === 1) return 'Tomorrow!'
    if (days <= 7) return `${days} days left`
    if (days <= 30) return `${Math.ceil(days / 7)} weeks left`
    return `${Math.ceil(days / 30)} months left`
  }

  const formatRelease = (date: string) => {
    try {
      return formatDate(date, locale, { day: 'numeric', month: 'short', year: 'numeric' }, { headline: true })
    } catch {
      return date
    }
  }

  return (
    <section id="upcoming" className="px-[4%] pb-10 pt-2" aria-labelledby="upcoming-heading">
      <div className="mb-5 flex items-center gap-3">
        <div
          className="h-[clamp(26px,5.6vw,40px)] w-1.5 shrink-0 rounded-full"
          style={{
            background: 'linear-gradient(to bottom, #ffd750, #f5c518, #e63946 62%, #7c3aed)',
            boxShadow: '0 0 22px rgba(245, 197, 24, 0.45), 0 0 10px rgba(230, 57, 70, 0.28)',
          }}
        />
        <h2
          id="upcoming-heading"
          className="font-display text-[clamp(1.35rem,3.2vw,1.85rem)] font-extrabold tracking-wide"
          style={{
            background: 'linear-gradient(177deg, #fffdf6 0%, #ffffff 24%, #f4f0ff 52%, #d2cae9 76%, #a79dc7 92%, #8b81ac 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            WebkitTextStroke: '0.4px rgba(255, 255, 255, 0.22)',
            filter: 'drop-shadow(0 4px 14px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 20px rgba(245, 197, 24, 0.12))',
          }}
        >
          UPCOMING RELEASES
        </h2>
      </div>

      <div
        className="grid gap-5"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(285px, 1fr))',
          gridAutoRows: 'minmax(370px, auto)',
        }}
      >
        {movies.map((m) => {
          const genres = genreNames(m.genre_ids, locale, 2)
          const dateStr = m.release_date ? formatRelease(m.release_date) : 'Coming Soon'
          const countdown = m.release_date ? relative(m.release_date) : ''
          const overview = (m.overview || '').slice(0, 120)
          const lang = (m.original_language || 'en').toUpperCase()
          const title = m.title || m.name || ''

          return (
            <Link
              key={m.id}
              href={`/movie/${m.id}`}
              className="group/upcoming relative flex flex-col overflow-hidden rounded-[20px] outline-none transition-[border-color] duration-250 focus-visible:ring-2 focus-visible:ring-[#f5c518]/50"
              style={{
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.008)), hsl(var(--card))',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 14px 42px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.035)',
              }}
            >
              {/* Poster / still — exact 185px 16:9 */}
              <div className="relative h-[185px] overflow-hidden">
                <TmdbImage
                  kind={m.backdrop_path ? 'backdrop' : 'poster'}
                  path={m.backdrop_path || m.poster_path}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 22vw, (min-width: 640px) 40vw, 100vw"
                  className="object-cover"
                  style={{ aspectRatio: '16/9', filter: 'saturate(1.05)' }}
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(3, 3, 10, 0.95), transparent 62%)' }}
                />

                {/* Release date badge (gold) */}
                <div
                  className="absolute bottom-2.5 left-3 flex items-center gap-1 rounded-[9px] px-[0.78rem] py-[0.3rem] text-[0.71rem] font-extrabold uppercase tracking-[0.4px] text-[#111]"
                  style={{
                    background: 'linear-gradient(135deg, #ffe566, #f5c518, #d4a017)',
                    boxShadow: '0 6px 18px rgba(245, 197, 24, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" className="shrink-0" aria-hidden>
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z" />
                  </svg>
                  {dateStr}
                </div>

                {/* Countdown badge */}
                {countdown && (
                  <div
                    className="absolute right-2.5 top-2.5 rounded-lg border px-2.5 py-1 text-[0.65rem] font-bold tracking-[0.3px] text-[#f5c518]"
                    style={{
                      background: 'rgba(8, 8, 16, 0.85)',
                      backdropFilter: 'blur(10px)',
                      borderColor: 'rgba(245, 197, 24, 0.3)',
                      animation: 'countdownPulse 2s ease-in-out infinite',
                    }}
                  >
                    ⏳ {countdown}
                  </div>
                )}

                {/* Hover play hint */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[rgba(3,3,10,0.7)] opacity-0 transition-opacity duration-300 group-hover/upcoming:opacity-100">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#f5c518" strokeWidth="1.5" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4l3 3" strokeLinecap="round" />
                  </svg>
                  <span className="text-[0.72rem] font-semibold uppercase tracking-[0.5px] text-[#f5c518]">View Details</span>
                </div>
              </div>

              {/* Info block — min 185px to match MovieZone row height */}
              <div className="flex min-h-[185px] flex-1 flex-col px-[1.1rem] pb-[0.9rem] pt-[1.05rem]">
                <h3
                  className="mb-2 min-h-[2.7em] text-[0.93rem] font-bold leading-[1.35] tracking-[0.1px] text-white line-clamp-2"
                >
                  {title}
                </h3>

                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-md border px-2 py-[0.18rem] text-[0.62rem] font-bold tracking-[0.5px]"
                    style={{
                      background: 'rgba(124, 58, 237, 0.2)',
                      borderColor: 'rgba(124, 58, 237, 0.4)',
                      color: '#a78bfa',
                    }}
                  >
                    {lang}
                  </span>
                  {genres.map((g) => (
                    <span
                      key={g}
                      className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-[0.18rem] text-[0.62rem] font-semibold text-white/60"
                    >
                      {g}
                    </span>
                  ))}
                </div>

                <p className="mb-3 line-clamp-2 text-[0.78rem] leading-[1.58] text-white/55">
                  {overview}
                  {m.overview && m.overview.length > 120 ? '…' : ''}
                </p>

                <div
                  className="mt-auto"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                >
                  <FollowButton
                    mediaType="movie"
                    id={String(m.id)}
                    title={title}
                    variant="hero"
                    className="!h-auto !rounded-lg !border-[#f5c518]/40 !bg-[#f5c518]/[0.08] !px-3.5 !py-1.5 !text-[0.78rem] !font-semibold !text-[#f5c518] hover:!scale-105 hover:!border-[#f5c518] hover:!bg-[#f5c518]/18"
                  />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <style jsx global>{`
        @keyframes countdownPulse {
          0%, 100% { border-color: rgba(245, 197, 24, 0.3); }
          50% { border-color: rgba(245, 197, 24, 0.7); box-shadow: 0 0 12px rgba(245, 197, 24, 0.2); }
        }
      `}</style>
    </section>
  )
}
