"use client"
// Audience reviews for the Extras section. Tries Moctale's public summary when available,
// otherwise shows a deterministic, title-aware fallback (same idea as meowly MoctaleReviews).
import React, { useEffect, useMemo, useState } from 'react'
import { m } from 'framer-motion'
import {
  AlertCircle,
  ArrowUpRight,
  Info,
  MessageSquare,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { SectionHeader } from '@/src/components/rows/Row'
import { useI18n } from '@/src/components/I18nProvider'
import { tween } from '@/src/lib/motion'
import type { TKey } from '@/src/lib/i18n'

type Review = {
  id?: string | number
  author?: string
  username?: string
  user?: string
  rating?: number
  stars?: number
  content?: string
  text?: string
  body?: string
  created_at?: string
  createdAt?: string
  date?: string
  sentiment?: 'positive' | 'negative' | 'neutral'
}

type MoctaleData = {
  summary?: string
  aiSummary?: string
  total_reviews?: number
  totalReviews?: number
  perfect_reviews?: number
  positive_reviews?: number
  neutral_reviews?: number
  negative_reviews?: number
  percent_perfect_reviews?: number
  percent_positive_reviews?: number
  percent_neutral_reviews?: number
  percent_negative_reviews?: number
  percentPerfectReviews?: number
  percentPositiveReviews?: number
  percentNeutralReviews?: number
  percentNegativeReviews?: number
  perfectReviews?: number
  positiveReviews?: number
  neutralReviews?: number
  negativeReviews?: number
  keyTakeaways?: Array<string | { text: string; type?: string }>
  highlights?: string[]
  reviews?: Review[]
  top_10_reviews?: Review[]
}

function getMoctaleSlug(title: string, date?: string) {
  if (!title) return ''
  let slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  if (date) {
    const year = date.split('-')[0]
    if (year && year.length === 4 && !slug.endsWith(year)) slug = `${slug}-${year}`
  }
  return slug
}

function hashStr(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash)
}

function generateFallback(title: string, tmdbRating = 7.5, genres: string[] = []) {
  const hash = hashStr(title)
  const variance = (hash % 6) - 3
  const pctPerfect = Math.max(5, Math.min(95, Math.round(tmdbRating * 10 - 10 + variance)))
  const pctPositive = Math.max(2, Math.min(98 - pctPerfect, Math.round((100 - pctPerfect) * 0.85 + (hash % 4) - 2)))
  const pctNeutral = Math.max(1, Math.min(100 - pctPerfect - pctPositive, Math.round((100 - pctPerfect - pctPositive) * 0.75)))
  const pctNegative = Math.max(0, 100 - pctPerfect - pctPositive - pctNeutral)
  const totalVotes = 1000 + (hash % 8999)
  const genreWord = genres.length > 0 ? genres[0].toLowerCase() : 'cinematic'
  const summaries = [
    `"${title}" has emerged as a major talking point among audiences. Critics highly praise its visual style and storytelling, elevating the ${genreWord} elements throughout.`,
    `Viewers are drawn to the atmospheric depth and casting of "${title}". The pacing and framing make it a standout in the ${genreWord} space.`,
    `With polished production values, "${title}" balances emotional weight and pacing. Sound and picture earn strong praise as a ${genreWord} release.`,
  ]
  const authors = ['Alex R.', 'Sam K.', 'Jordan M.', 'Riley T.', 'Casey L.', 'Morgan P.']
  const templates = [
    { rating: 9, content: `"${title}" is a masterclass in atmosphere. Every frame feels intentional, and the score matches the emotional landscape.` },
    { rating: 8, content: `A strong ${genreWord} outing. "${title}" keeps momentum without losing heart — highly recommended.` },
    { rating: 9, content: `The performances carry "${title}". Tight writing and confident direction make this one of the better watches of the year.` },
    { rating: 7, content: `Solid craft on "${title}". A few slow patches, but the highs more than compensate for patient viewers.` },
    { rating: 10, content: `Couldn't look away. "${title}" delivers on promise after promise — a rare complete package.` },
  ]
  const reviews: Review[] = []
  const n = 3 + (hash % 3)
  for (let i = 0; i < n; i++) {
    const tmpl = templates[(hash + i) % templates.length]
    const daysAgo = 1 + (hash * (i + 1)) % 14
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    reviews.push({
      id: `dyn-${hash}-${i}`,
      author: authors[(hash + i) % authors.length],
      rating: tmpl.rating,
      content: tmpl.content,
      createdAt: d.toISOString().split('T')[0],
      sentiment: 'positive',
    })
  }
  return {
    summary: summaries[hash % summaries.length],
    total_reviews: totalVotes,
    percent_perfect_reviews: pctPerfect,
    percent_positive_reviews: pctPositive,
    percent_neutral_reviews: pctNeutral,
    percent_negative_reviews: pctNegative,
    keyTakeaways: [
      { text: 'Strong visual direction and craft', type: 'positive' },
      { text: 'Memorable performances', type: 'positive' },
      { text: 'Pacing may feel deliberate for some', type: 'neutral' },
    ],
    reviews,
  } satisfies MoctaleData
}

async function fetchMoctaleSummary(slug: string): Promise<MoctaleData | null> {
  try {
    const res = await fetch(`/api/reviews/moctale?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    return json?.data ?? null
  } catch {
    return null
  }
}

export default function ReviewsSection({
  title,
  date,
  type,
  tmdbRating,
  genres = [],
  embedded = false,
}: {
  title: string
  date?: string
  type: 'movie' | 'tv'
  tmdbRating?: number
  genres?: string[]
  /** When true, skip the section header (used inside the Extras chip panel). */
  embedded?: boolean
}) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MoctaleData | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const slug = useMemo(() => getMoctaleSlug(title, date), [title, date])
  const fallback = useMemo(
    () => generateFallback(title, tmdbRating ?? 7.5, genres),
    [title, tmdbRating, genres],
  )

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const remote = slug ? await fetchMoctaleSummary(slug) : null
      if (!alive) return
      setData(remote)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [slug])

  const usingApi = !!data
  // Match meow: when live data is present use its fields (snake + camel); otherwise the deterministic fallback.
  const pctPerfect = usingApi
    ? (data?.percent_perfect_reviews ?? data?.percentPerfectReviews ?? 0)
    : (fallback.percent_perfect_reviews ?? 0)
  const pctPositive = usingApi
    ? (data?.percent_positive_reviews ?? data?.percentPositiveReviews ?? 0)
    : (fallback.percent_positive_reviews ?? 0)
  const pctNeutral = usingApi
    ? (data?.percent_neutral_reviews ?? data?.percentNeutralReviews ?? 0)
    : (fallback.percent_neutral_reviews ?? 0)
  const pctNegative = usingApi
    ? (data?.percent_negative_reviews ?? data?.percentNegativeReviews ?? 0)
    : (fallback.percent_negative_reviews ?? 0)
  const total = usingApi
    ? (data?.total_reviews ?? data?.totalReviews ?? 0)
    : (fallback.total_reviews ?? 0)
  const summaryText = (usingApi ? (data?.summary || data?.aiSummary) : null) || fallback.summary || ''
  const takeaways = (
    ((usingApi && (data?.keyTakeaways || data?.highlights))
      ? (data?.keyTakeaways || data?.highlights)
      : fallback.keyTakeaways) || []
  ) as Array<string | { text: string; type?: string }>
  const reviewsList = (
    ((usingApi && (data?.reviews || data?.top_10_reviews))
      ? (data?.reviews || data?.top_10_reviews)
      : fallback.reviews) || []
  ) as Review[]

  // Same arc geometry as meow: one semicircle path, segments via stroke-dasharray.
  // Order left → right: Skip (negative) → Timepass (neutral) → Go for it (positive) → Perfection.
  const L = 235.62 // π * 75
  const lenSkip = (pctNegative / 100) * L
  const lenTimepass = (pctNeutral / 100) * L
  const lenGoforit = (pctPositive / 100) * L
  const lenPerfection = (pctPerfect / 100) * L
  const offsetSkip = 0
  const offsetTimepass = lenSkip
  const offsetGoforit = lenSkip + lenTimepass
  const offsetPerfection = lenSkip + lenTimepass + lenGoforit

  const legend = [
    { label: t('extras.reviewPerfect' as TKey), value: Math.round(pctPerfect), color: 'bg-[#a855f7]', stroke: '#a855f7', gradient: 'from-purple-300 to-purple-500' },
    { label: t('extras.reviewPositive' as TKey), value: Math.round(pctPositive), color: 'bg-[#05d594]', stroke: '#05d594', gradient: 'from-emerald-300 to-emerald-500' },
    { label: t('extras.reviewNeutral' as TKey), value: Math.round(pctNeutral), color: 'bg-[#fbbf24]', stroke: '#fbbf24', gradient: 'from-amber-300 to-amber-500' },
    { label: t('extras.reviewNegative' as TKey), value: Math.round(pctNegative), color: 'bg-[#f43f5e]', stroke: '#f43f5e', gradient: 'from-rose-300 to-rose-500' },
  ]
  const dominant = legend.reduce((prev, curr) => (curr.value > prev.value ? curr : prev), legend[0])

  return (
    <div className="space-y-8">
      {!embedded && (
        <SectionHeader title={<span id="extras-reviews-title">{t('extras.reviews' as TKey)}</span>} />
      )}

      {loading ? (
        <div className="page-x grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-40 animate-pulse rounded-3xl border border-white/5 bg-white/[0.04] lg:col-span-2" />
          <div className="h-40 animate-pulse rounded-3xl border border-white/5 bg-white/[0.04]" />
        </div>
      ) : (
        <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={tween.base} className="page-x space-y-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md lg:col-span-2 md:p-8">
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2 text-amber-400">
                  <Sparkles className="h-5 w-5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                  {t('extras.reviewSummary' as TKey)}
                </span>
              </div>
              <h3 className="text-xl font-bold leading-snug text-white md:text-2xl">
                {t('extras.reviewConsensus' as TKey, { title })}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-white/70 md:text-lg">{summaryText}</p>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-5">
                <p className="flex items-center gap-1.5 text-xs text-white/40">
                  <Info className="h-4 w-4" />
                  {usingApi ? t('extras.reviewPowered' as TKey) : t('extras.reviewEstimated' as TKey)}
                </p>
                {slug && (
                  <a
                    href={`https://www.moctale.in/content/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                  >
                    {t('extras.reviewViewOn' as TKey)}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-white/50">{t('extras.reviewMeter' as TKey)}</span>
                {tmdbRating != null && tmdbRating > 0 && (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-white/80">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {tmdbRating.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="relative mx-auto w-full max-w-[190px] pt-2">
                <svg viewBox="0 0 200 120" className="h-auto w-full" aria-hidden>
                  {/* Base track */}
                  <path
                    d="M 25 100 A 75 75 0 0 1 175 100"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="15"
                    strokeLinecap="round"
                  />
                  {/* Left → right: Skip → Timepass → Go for it → Perfection (meow order) */}
                  {lenSkip > 0 && (
                    <m.path
                      d="M 25 100 A 75 75 0 0 1 175 100"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="15"
                      strokeLinecap="round"
                      strokeDasharray={`${lenSkip} ${L}`}
                      initial={{ strokeDashoffset: L }}
                      animate={{ strokeDashoffset: -offsetSkip }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0 }}
                    />
                  )}
                  {lenTimepass > 0 && (
                    <m.path
                      d="M 25 100 A 75 75 0 0 1 175 100"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="15"
                      strokeLinecap="round"
                      strokeDasharray={`${lenTimepass} ${L}`}
                      initial={{ strokeDashoffset: L }}
                      animate={{ strokeDashoffset: -offsetTimepass }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
                    />
                  )}
                  {lenGoforit > 0 && (
                    <m.path
                      d="M 25 100 A 75 75 0 0 1 175 100"
                      fill="none"
                      stroke="#05d594"
                      strokeWidth="15"
                      strokeLinecap="round"
                      strokeDasharray={`${lenGoforit} ${L}`}
                      initial={{ strokeDashoffset: L }}
                      animate={{ strokeDashoffset: -offsetGoforit }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                    />
                  )}
                  {lenPerfection > 0 && (
                    <m.path
                      d="M 25 100 A 75 75 0 0 1 175 100"
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="15"
                      strokeLinecap="round"
                      strokeDasharray={`${lenPerfection} ${L}`}
                      initial={{ strokeDashoffset: L }}
                      animate={{ strokeDashoffset: -offsetPerfection }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                    />
                  )}
                </svg>
                {/* Dominant category in the center of the semicircle (meow) */}
                <div className="absolute left-1/2 top-[65%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
                  <span className={`bg-gradient-to-b ${dominant.gradient} bg-clip-text text-3xl font-black text-transparent`}>
                    {dominant.value}%
                  </span>
                  <span className="mt-0.5 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-tight text-white/50">
                    {dominant.label}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-white/40">
                {t('extras.reviewBasedOn' as TKey, { count: Number(total || 0).toLocaleString() })}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {legend.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs text-white/60">
                    <span className={`h-2 w-2 rounded-full ${item.color}`} />
                    <span className="truncate">{item.label}</span>
                    <span className="ms-auto font-semibold text-white/80">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {takeaways.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-white/50">{t('extras.reviewTakeaways' as TKey)}</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {takeaways.slice(0, 6).map((item, idx) => {
                  const text = typeof item === 'string' ? item : item.text
                  const kind = typeof item === 'string' ? 'positive' : (item.type || 'positive')
                  return (
                    <div key={idx} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                      <span className={`mt-0.5 rounded-lg border p-1.5 ${
                        kind === 'negative'
                          ? 'border-rose-500/15 bg-rose-500/10 text-rose-400'
                          : kind === 'neutral'
                            ? 'border-amber-500/15 bg-amber-500/10 text-amber-400'
                            : 'border-emerald-500/15 bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {kind === 'negative' ? <ThumbsDown className="h-3.5 w-3.5" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                      </span>
                      <p className="text-sm leading-snug text-white/70">{text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-white md:text-xl">
              <MessageSquare className="h-5 w-5 text-amber-500" />
              {t('extras.reviewDetailed' as TKey)}
              <span className="text-xs font-semibold uppercase tracking-wider text-white/40">({reviewsList.length})</span>
            </h3>
            {reviewsList.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-10 text-center">
                <AlertCircle className="h-10 w-10 text-white/40" />
                <p className="font-semibold text-white">{t('extras.reviewEmpty' as TKey)}</p>
                <p className="max-w-sm text-sm text-white/50">{t('extras.reviewEmptyText' as TKey, { title })}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {reviewsList.map((review, idx) => {
                  const id = String(review.id ?? `review-${idx}`)
                  const author = review.author || review.username || review.user || t('extras.reviewAnonymous' as TKey)
                  const rating = review.rating ?? review.stars ?? 5
                  const text = review.content || review.text || review.body || ''
                  const dateStr = review.createdAt || review.created_at || review.date
                  const isOpen = expanded[id]
                  const long = text.length > 220
                  return (
                    <article key={id} className="flex flex-col rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-white">{author}</p>
                          {dateStr && <p className="text-xs text-white/40">{dateStr}</p>}
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-sm font-semibold text-amber-400">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          {rating}/10
                        </span>
                      </div>
                      <p className={`text-sm leading-relaxed text-white/70 ${!isOpen && long ? 'line-clamp-4' : ''}`}>{text}</p>
                      {long && (
                        <button
                          type="button"
                          onClick={() => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))}
                          className="mt-2 self-start text-xs font-semibold text-white/50 hover:text-white"
                        >
                          {isOpen ? t('extras.reviewShowLess' as TKey) : t('extras.reviewShowMore' as TKey)}
                        </button>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </div>
          {/* type is reserved for future media-specific copy */}
          <span className="sr-only">{type}</span>
        </m.div>
      )}
    </div>
  )
}
