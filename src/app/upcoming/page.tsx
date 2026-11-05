import Link from 'next/link'
import { Calendar } from 'lucide-react'
import PageNav from '@/src/components/PageNav'
import PageHeader from '@/src/components/browse/PageHeader'
import { EmptyState } from '@/src/components/MediaGrid'
import FollowButton from '@/src/components/FollowButton'
import TmdbImage from '@/src/components/TmdbImage'
import { getList, parsePage } from '@/src/lib/lists'
import { getLocale, getT } from '@/src/lib/i18n/server'
import { formatDate } from '@/src/lib/i18n/format'
import { catalogueLanguage } from '@/src/lib/tmdb-locale'
import { genreNames } from '@/src/lib/genres'
import { tunisToday } from '@/src/lib/pick-of-the-day'
import { kidsList } from '@/src/lib/kids'
import { getKidsMode } from '@/src/lib/profiles'
import { pageMetadata } from '@/src/lib/seo'

export const dynamic = 'force-dynamic'
export const generateMetadata = () => {
  const t = getT()
  return pageMetadata({
    title: t('upcoming.title'),
    description: t('upcoming.subtitle'),
    path: '/upcoming',
    card: 'upcoming',
  })
}

const DAY = 86400000

/**
 * Upcoming Releases page — Moviezonne-style grid cards (16:9 backdrop, gold
 * release badge, countdown, lang/genre chips, synopsis, Notify me).
 */
export default async function UpcomingPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const page = parsePage(searchParams.page)
  const kids = kidsList('movie', 'upcoming')
  const locale = getLocale()
  const language = catalogueLanguage(locale)
  const { results, totalPages, failed } = (await getKidsMode())
    ? await getList(kids.path, page, { ...kids.params, language })
    : await getList('movie/upcoming', page, { language })
  const t = getT()
  const today = tunisToday()

  const sorted = [...results].sort((a: any, b: any) =>
    (a.release_date ?? '').localeCompare(b.release_date ?? '')
  )

  const relative = (date: string) => {
    if (!date) return null
    const days = Math.round(
      (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY
    )
    if (days < 0) return null
    if (days === 0) return t('upcoming.today')
    if (days === 1) return t('upcoming.tomorrow')
    if (days < 7) return t('upcoming.inDays', { count: days })
    if (days < 30) {
      const weeks = Math.ceil(days / 7)
      return weeks === 1 ? '1 week left' : `${weeks} weeks left`
    }
    const months = Math.ceil(days / 30)
    return months === 1 ? '1 month left' : `${months} months left`
  }

  return (
    <div className="pb-10">
      <PageHeader title={t('upcoming.title')} subtitle={t('upcoming.subtitle')} />
      <div className="page-x">
        {failed ? (
          <EmptyState title={t('upcoming.failed')} />
        ) : sorted.length === 0 ? (
          <EmptyState title={t('upcoming.failed')} />
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((item: any) => {
              const date: string = item.release_date || ''
              const genres = genreNames(item.genre_ids, locale).slice(0, 3)
              const countdown = relative(date)
              const dateLabel = date
                ? formatDate(date, locale, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : null
              const lang = (item.original_language || 'en').toUpperCase()
              const path = item.backdrop_path || item.poster_path
              const kind = item.backdrop_path ? 'backdrop' : 'poster'
              if (!path) return null

              return (
                <li key={item.id}>
                  <article className="group/upcoming relative flex h-full min-h-[370px] flex-col overflow-hidden rounded-[20px] border border-white/[0.06] bg-gradient-to-b from-white/[0.035] to-white/[0.008] shadow-[0_14px_42px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.035)] transition-[border-color] duration-250 hover:border-[rgba(245,197,24,0.32)]">
                    <div className="relative h-[185px] shrink-0 overflow-hidden">
                      <TmdbImage
                        kind={kind as 'backdrop' | 'poster'}
                        path={path}
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 22vw, (min-width: 640px) 40vw, 100vw"
                        className="object-cover saturate-[1.05] transition-transform duration-500 ease-out group-hover/upcoming:scale-[1.04]"
                      />
                      <div
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-t from-[rgba(3,3,10,0.95)] via-transparent to-transparent"
                      />
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[rgba(3,3,10,0.7)] opacity-0 transition-opacity duration-300 group-hover/upcoming:opacity-100">
                        <svg
                          viewBox="0 0 24 24"
                          width="32"
                          height="32"
                          fill="none"
                          stroke="#FFC53D"
                          strokeWidth="1.5"
                          aria-hidden
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 8v4l3 3" strokeLinecap="round" />
                        </svg>
                        <span className="text-[0.72rem] font-semibold uppercase tracking-wide text-[#FFC53D]">
                          View Details
                        </span>
                      </div>
                      {dateLabel && (
                        <div className="absolute bottom-2.5 left-3 inline-flex items-center gap-1 rounded-[9px] bg-gradient-to-br from-[#fff3b0] via-[#f5c518] to-[#c68000] px-[0.78rem] py-[0.3rem] text-[0.71rem] font-extrabold uppercase tracking-wide text-[#111] shadow-[0_6px_18px_rgba(245,197,24,0.3),inset_0_1px_0_rgba(255,255,255,0.4)]">
                          <Calendar
                            aria-hidden
                            className="h-3 w-3"
                            strokeWidth={2.5}
                          />
                          {dateLabel}
                        </div>
                      )}
                      {countdown && (
                        <div className="absolute right-2.5 top-2.5 rounded-lg border border-[rgba(245,197,24,0.3)] bg-[rgba(8,8,16,0.85)] px-2.5 py-1 text-[0.65rem] font-bold tracking-wide text-[#FFC53D] backdrop-blur-[10px]">
                          ⏳ {countdown}
                        </div>
                      )}
                    </div>

                    <div className="flex min-h-[185px] flex-1 flex-col px-[1.1rem] pb-[0.9rem] pt-[1.05rem]">
                      <h2 className="mb-2 line-clamp-2 min-h-[2.7em] text-[0.93rem] font-bold leading-[1.35] tracking-tight text-white">
                        <Link
                          href={`/movie/${item.id}`}
                          className="outline-none after:absolute after:inset-0 after:rounded-[20px] focus-visible:after:ring-2 focus-visible:after:ring-red-500"
                        >
                          <bdi>{item.title}</bdi>
                        </Link>
                      </h2>

                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-[rgba(124,58,237,0.4)] bg-[rgba(124,58,237,0.2)] px-2 py-[0.18rem] text-[0.62rem] font-bold tracking-wide text-[#a78bfa]">
                          {lang}
                        </span>
                        {genres.map((g) => (
                          <span
                            key={g}
                            className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-[0.18rem] text-[0.62rem] font-semibold text-white/50"
                          >
                            {g}
                          </span>
                        ))}
                      </div>

                      {item.overview && (
                        <p className="line-clamp-2 text-[0.78rem] leading-[1.58] text-white/45">
                          {item.overview}
                        </p>
                      )}

                      {date && date > today && (
                        <div className="relative z-10 mt-auto pt-3">
                          <FollowButton
                            mediaType="movie"
                            id={String(item.id)}
                            title={item.title}
                          />
                        </div>
                      )}
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
        <PageNav currentPage={page} totalPages={totalPages} />
      </div>
    </div>
  )
}
