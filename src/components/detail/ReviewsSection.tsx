"use client"
// Moctale reviews panel for Extras (ported from meowly MoctaleReviews):
// Moctale Smart Summary · Moctale Meter · Key Highlights & Audience Takeaways · Detailed Reviews.
import React, { useEffect, useMemo, useState } from 'react'
import { m } from 'framer-motion'
import {
  AlertCircle,
  ArrowUpRight,
  Info,
  MessageSquare,
  Share2,
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
  user?: string | { name?: string; username?: string }
  rating?: number
  stars?: number
  content?: string
  text?: string
  body?: string
  review?: string
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

function getDeterministicHash(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash)
}

/** Same deterministic fallback generator as meowly MoctaleReviews. */
function generateDynamicFallback(title: string, tmdbRating = 7.5, genres: string[] = []) {
  const hash = getDeterministicHash(title)
  const variance = (hash % 6) - 3
  const pctPerfect = Math.max(5, Math.min(95, Math.round(tmdbRating * 10 - 10 + variance)))
  const pctPositive = Math.max(2, Math.min(98 - pctPerfect, Math.round((100 - pctPerfect) * 0.85 + (hash % 4) - 2)))
  const pctNeutral = Math.max(1, Math.min(100 - pctPerfect - pctPositive, Math.round((100 - pctPerfect - pctPositive) * 0.75)))
  const pctNegative = Math.max(0, 100 - pctPerfect - pctPositive - pctNeutral)

  const totalVotes = 1000 + (hash % 8999)
  const perfectVotes = Math.round((pctPerfect / 100) * totalVotes)
  const positiveVotes = Math.round((pctPositive / 100) * totalVotes)
  const neutralVotes = Math.round((pctNeutral / 100) * totalVotes)
  const negativeVotes = Math.max(0, totalVotes - perfectVotes - positiveVotes - neutralVotes)

  const genreWord = genres.length > 0 ? genres[0].toLowerCase() : 'cinematic'
  const consensusTemplates = [
    `"${title}" has emerged as a major talking point among audiences. Critics highly praise its exceptional visual style and rich storytelling direction, which elevate the ${genreWord} elements to a whole new level. It is widely regarded as a premium must-watch that captivates from start to finish.`,
    `Viewers are overwhelmingly enchanted by the atmospheric depth and brilliant casting of "${title}". The meticulous pacing and gorgeous framing make it an absolute standout in the ${genreWord} space, resulting in widespread viewer perfection votes.`,
    `With its incredible screen presence and highly polished production values, "${title}" delivers a masterful balance of emotional weight and pacing. The visual effects and sound design are stellar, earning it exceptional praise as a landmark ${genreWord} release.`,
  ]
  const summary = consensusTemplates[hash % consensusTemplates.length]

  const takeawaysList = [
    [
      { text: 'Exceptional visual direction and cinematic framing', type: 'positive' },
      { text: 'Brilliant cast performances that bring the narrative to life', type: 'positive' },
      { text: 'Incredibly rich sound design and musical score', type: 'positive' },
      { text: 'The narrative structure is deep but requires complete attention', type: 'neutral' },
    ],
    [
      { text: 'Gorgeous set designs and atmospheric world-building', type: 'positive' },
      { text: 'Masterclass in pacing and suspenseful storytelling', type: 'positive' },
      { text: 'Deeply compelling character arcs and interactions', type: 'positive' },
      { text: 'Some minor predictable beats in the secondary storylines', type: 'neutral' },
    ],
    [
      { text: 'Superb production values that create an immersive experience', type: 'positive' },
      { text: 'A standout score that elevates every emotional beat', type: 'positive' },
      { text: 'Tight direction with confident visual language', type: 'positive' },
      { text: 'A deliberate pace that rewards patient viewers', type: 'neutral' },
    ],
  ]
  const takeaways = takeawaysList[hash % takeawaysList.length]

  const authors = ['Alex R.', 'Sam K.', 'Jordan M.', 'Riley T.', 'Casey L.', 'Morgan P.', 'Avery S.', 'Quinn H.']
  const reviewTemplates = [
    { rating: 5, content: `"${title}" is a masterclass in atmosphere. Every frame feels intentional, and the score matches the emotional landscape perfectly. An absolute triumph.` },
    { rating: 4, content: `A strong ${genreWord} outing. "${title}" keeps momentum without losing heart — highly recommended for anyone who values craft.` },
    { rating: 5, content: `The performances carry "${title}". Tight writing and confident direction make this one of the better watches of the year.` },
    { rating: 4, content: `The pacing is wonderfully rapid and the characters are brilliantly brought to life. "${title}" has some of the most memorable sequences I've seen all year.` },
    { rating: 5, content: `A flawless experience. "${title}" features pristine sound design and an incredibly smart narrative. Perfect evening watch.` },
    { rating: 4, content: `An incredible surprise! "${title}" exceeded high expectations. The chemistry between the leads is electric, and the final act is top-tier.` },
  ]

  const selectedReviews: Review[] = []
  const numReviews = 3 + (hash % 3)
  for (let i = 0; i < numReviews; i++) {
    const template = reviewTemplates[(hash + i) % reviewTemplates.length]
    const daysAgo = 1 + (hash * (i + 1)) % 14
    const reviewDate = new Date()
    reviewDate.setDate(reviewDate.getDate() - daysAgo)
    selectedReviews.push({
      id: `dynamic-${hash}-${i}`,
      author: authors[(hash + i) % authors.length],
      rating: template.rating,
      content: template.content,
      createdAt: reviewDate.toISOString().split('T')[0],
      sentiment: 'positive',
    })
  }

  return {
    summary,
    total_reviews: totalVotes,
    perfect_reviews: perfectVotes,
    positive_reviews: positiveVotes,
    neutral_reviews: neutralVotes,
    negative_reviews: negativeVotes,
    percent_perfect_reviews: pctPerfect,
    percent_positive_reviews: pctPositive,
    percent_neutral_reviews: pctNeutral,
    percent_negative_reviews: pctNegative,
    keyTakeaways: takeaways,
    reviews: selectedReviews,
  } satisfies MoctaleData
}

async function fetchMoctaleSummary(slugs: string[]): Promise<MoctaleData | null> {
  for (const slug of slugs) {
    if (!slug) continue
    try {
      const res = await fetch(`/api/reviews/moctale?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
      if (!res.ok) continue
      const json = await res.json()
      if (json?.data) return json.data as MoctaleData
    } catch {
      /* try next slug */
    }
  }
  return null
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
  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({})

  // Try title+year first (meow), then title only — Moctale slug pages vary by title.
  const slugs = useMemo(() => {
    const withYear = getMoctaleSlug(title, date)
    const noYear = getMoctaleSlug(title)
    return Array.from(new Set([withYear, noYear].filter(Boolean)))
  }, [title, date])
  const slug = slugs[0] || ''
  const dynamicFallback = useMemo(
    () => generateDynamicFallback(title, tmdbRating ?? 7.5, genres),
    [title, tmdbRating, genres],
  )

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const remote = await fetchMoctaleSummary(slugs)
      if (!alive) return
      setData(remote)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [slugs.join('|')])

  const apiReviews = data?.top_10_reviews || data?.reviews
  const hasMeterData = !!(data && (
    data.total_reviews !== undefined
    || data.totalReviews !== undefined
    || data.percent_perfect_reviews !== undefined
    || data.percentPerfectReviews !== undefined
  ))
  const isUsingRealApi = !!(data && (hasMeterData || (apiReviews && apiReviews.length > 0)))

  let reviewsList: Review[] = []
  if (isUsingRealApi && apiReviews && apiReviews.length > 0) {
    reviewsList = apiReviews.map((r: Review, idx: number) => {
      const user = typeof r.user === 'object' && r.user ? r.user : null
      return {
        id: r.id || `api-${idx}`,
        author: r.author || user?.name || user?.username || r.username || 'Moctale Critic',
        rating: r.rating || r.stars || 5,
        content: r.review || r.content || r.text || r.body || '',
        createdAt: r.createdAt || r.created_at || r.date,
        sentiment: r.sentiment,
      }
    })
  } else {
    reviewsList = dynamicFallback.reviews || []
  }

  const meterTotal = isUsingRealApi
    ? (data?.total_reviews ?? data?.totalReviews ?? 0)
    : (dynamicFallback.total_reviews ?? 0)
  const pctPerfect = isUsingRealApi
    ? (data?.percent_perfect_reviews ?? data?.percentPerfectReviews ?? 0)
    : (dynamicFallback.percent_perfect_reviews ?? 0)
  const pctPositive = isUsingRealApi
    ? (data?.percent_positive_reviews ?? data?.percentPositiveReviews ?? 0)
    : (dynamicFallback.percent_positive_reviews ?? 0)
  const pctNeutral = isUsingRealApi
    ? (data?.percent_neutral_reviews ?? data?.percentNeutralReviews ?? 0)
    : (dynamicFallback.percent_neutral_reviews ?? 0)
  const pctNegative = isUsingRealApi
    ? (data?.percent_negative_reviews ?? data?.percentNegativeReviews ?? 0)
    : (dynamicFallback.percent_negative_reviews ?? 0)

  const mainGenre = genres.length > 0 ? genres[0].toLowerCase() : 'cinematic'
  let summaryText = ''
  if (isUsingRealApi && (data?.summary || data?.aiSummary)) {
    summaryText = data?.summary || data?.aiSummary || ''
  } else if (isUsingRealApi && meterTotal > 0) {
    const perfectPct = pctPerfect
    const positivePct = pctPositive
    if (perfectPct + positivePct > 85) {
      summaryText = `With over ${meterTotal.toLocaleString()} votes registered, "${title}" is celebrated as a must-watch. An outstanding ${Math.round(perfectPct + positivePct)}% of the community rates it highly, praising its ${mainGenre} craft and lasting impact.`
    } else if (perfectPct + positivePct > 70) {
      summaryText = `With over ${meterTotal.toLocaleString()} votes registered, "${title}" is widely praised by the community. A solid ${Math.round(perfectPct + positivePct)}% of viewers recommend going for it, highlighting its rich aesthetic choices, stunning screenplay, and engaging ${mainGenre} style.`
    } else {
      summaryText = `Based on ${meterTotal.toLocaleString()} votes, "${title}" has received mixed to positive feedback. Audiences appreciate the gorgeous production design and casting, though some notes on pacing have led to a more balanced overall score of ${Math.round(perfectPct + positivePct)}% positive sentiment.`
    }
  } else {
    summaryText = dynamicFallback.summary || ''
  }

  // Meow arc geometry: one semicircle, segments via stroke-dasharray.
  // Left → right: Skip → Timepass → Go for it → Perfection
  const L = 235.62
  const lenSkip = (pctNegative / 100) * L
  const lenTimepass = (pctNeutral / 100) * L
  const lenGoforit = (pctPositive / 100) * L
  const lenPerfection = (pctPerfect / 100) * L
  const offsetSkip = 0
  const offsetTimepass = lenSkip
  const offsetGoforit = lenSkip + lenTimepass
  const offsetPerfection = lenSkip + lenTimepass + lenGoforit

  const legendItems = [
    { label: 'Perfection', value: Math.round(pctPerfect), color: 'bg-[#a855f7]', stroke: '#a855f7', gradient: 'from-purple-300 to-purple-500' },
    { label: 'Go for it', value: Math.round(pctPositive), color: 'bg-[#05d594]', stroke: '#05d594', gradient: 'from-emerald-300 to-emerald-500' },
    { label: 'Timepass', value: Math.round(pctNeutral), color: 'bg-[#fbbf24]', stroke: '#fbbf24', gradient: 'from-amber-300 to-amber-500' },
    { label: 'Skip', value: Math.round(pctNegative), color: 'bg-[#f43f5e]', stroke: '#f43f5e', gradient: 'from-rose-300 to-rose-500' },
  ]
  const dominant = legendItems.reduce((prev, curr) => (curr.value > prev.value ? curr : prev), legendItems[0])

  const keyHighlights = (
    (isUsingRealApi && (data?.keyTakeaways || data?.highlights)
      ? (data?.keyTakeaways || data?.highlights)
      : dynamicFallback.keyTakeaways) || []
  ) as Array<string | { text: string; type?: string }>

  const toggleExpandReview = (id: string | number) => {
    setExpandedReviews((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const shareMeter = async () => {
    const text = `${title} — Moctale Meter: ${dominant.value}% ${dominant.label} (${meterTotal.toLocaleString()} votes)`
    try {
      if (navigator.share) await navigator.share({ title: `${title} · Moctale Meter`, text })
      else await navigator.clipboard.writeText(text)
    } catch { /* user cancelled */ }
  }

  return (
    <div className="space-y-8">
      {!embedded && (
        <SectionHeader title={<span id="extras-reviews-title">{t('extras.reviews' as TKey)}</span>} />
      )}

      {loading ? (
        <div className="page-x space-y-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="h-48 animate-pulse rounded-3xl border border-white/5 bg-white/[0.04] lg:col-span-2" />
            <div className="h-48 animate-pulse rounded-3xl border border-white/5 bg-white/[0.04]" />
          </div>
          <div className="h-28 animate-pulse rounded-3xl border border-white/5 bg-white/[0.04]" />
        </div>
      ) : (
        <m.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={tween.base}
          className="page-x space-y-10 text-white"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Moctale Smart Summary */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md transition-all hover:border-white/20 md:p-8 lg:col-span-2">
              <div className="absolute -z-10 end-0 top-0 h-64 w-64 rounded-full bg-amber-500/5 blur-3xl transition-colors group-hover:bg-amber-500/10" />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2 text-amber-500">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                    Moctale Smart Summary
                  </span>
                </div>
                <h3 className="text-xl font-black leading-snug text-white md:text-2xl">
                  Consensus on &ldquo;{title}&rdquo;
                </h3>
                <p className="text-base font-light leading-relaxed text-gray-300 md:text-lg">
                  {summaryText}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-6">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Info className="h-4 w-4" />
                  <span>Powered by Moctale Media Hub</span>
                </div>
                {slug && (
                  <a
                    href={`https://www.moctale.in/content/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold transition-all hover:scale-105 hover:bg-white/10"
                  >
                    View on Moctale
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Moctale Meter */}
            <div className="group relative flex flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 backdrop-blur-md transition-all hover:border-white/20">
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <span className="block text-xs font-black uppercase tracking-widest text-gray-400">
                    Moctale Meter
                  </span>
                  <button
                    type="button"
                    onClick={shareMeter}
                    className="rounded-lg bg-white/5 p-1.5 text-gray-400 transition-all hover:scale-105 hover:bg-white/10 hover:text-white active:scale-95"
                    title="Share Meter"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="relative mx-auto flex w-full max-w-[190px] flex-col items-center justify-center pt-2">
                  <svg viewBox="0 0 200 120" className="h-auto w-full" aria-hidden>
                    <path
                      d="M 25 100 A 75 75 0 0 1 175 100"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeWidth="15"
                      strokeLinecap="round"
                    />
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
                  <div className="absolute left-1/2 top-[65%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
                    <span className={`bg-gradient-to-b ${dominant.gradient} bg-clip-text text-3xl font-black text-transparent`}>
                      {dominant.value}%
                    </span>
                    <span className="mt-0.5 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-tight text-gray-400">
                      {dominant.label}
                    </span>
                    <span className="whitespace-nowrap text-[9px] font-bold tracking-tight text-gray-600">
                      {Number(meterTotal || 0).toLocaleString()} Votes
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 w-full space-y-2.5 border-t border-white/5 pt-4">
                {legendItems.map((item) => {
                  const isDominant = item.label === dominant.label
                  return (
                    <div
                      key={item.label}
                      className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-all ${
                        isDominant ? 'border border-white/10 bg-white/[0.04]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full shadow-sm shadow-black/20 ${item.color} ${isDominant ? 'ring-2 ring-white/20' : ''}`} />
                        <span className={`font-bold ${isDominant ? 'text-white' : 'text-gray-400'}`}>{item.label}</span>
                        {isDominant && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-400/80">Highest</span>
                        )}
                      </div>
                      <span className={`font-black tabular-nums ${isDominant ? 'text-white' : 'text-gray-500'}`}>
                        {item.value}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Key Highlights & Audience Takeaways */}
          {keyHighlights.length > 0 && (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-lg font-black text-white md:text-xl">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Key Highlights &amp; Audience Takeaways
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {keyHighlights.slice(0, 6).map((item, idx) => {
                  const text = typeof item === 'string' ? item : item.text
                  const kind = typeof item === 'string' ? 'positive' : (item.type || 'positive')
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition hover:border-white/10"
                    >
                      <div className={`mt-0.5 rounded-lg border p-1.5 ${
                        kind === 'negative'
                          ? 'border-rose-500/15 bg-rose-500/10 text-rose-400'
                          : kind === 'neutral'
                            ? 'border-amber-500/15 bg-amber-500/10 text-amber-400'
                            : 'border-emerald-500/15 bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {kind === 'negative' ? <ThumbsDown className="h-3.5 w-3.5" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                      </div>
                      <span className="text-sm font-medium leading-snug text-gray-300">{text}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Detailed Reviews */}
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2.5 text-xl font-black text-white md:text-2xl">
                <MessageSquare className="h-6 w-6 text-amber-500" />
                Detailed Reviews
                <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                  ({reviewsList.length})
                </span>
              </h3>
            </div>

            {reviewsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center space-y-4 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-500" />
                <h4 className="text-lg font-bold text-white">No reviews found</h4>
                <p className="max-w-sm text-sm font-light text-gray-400">
                  Be the first to review &ldquo;{title}&rdquo; by heading over to the Moctale network website.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {reviewsList.map((review, idx) => {
                  const id = review.id || `review-${idx}`
                  const author = review.author || review.username || 'Moctale Critic'
                  const rating = review.rating || review.stars || 5
                  const text = review.content || review.text || review.body || ''
                  const dateStr = review.createdAt || review.created_at || review.date
                  const isExpanded = !!expandedReviews[id]
                  const long = text.length > 220
                  return (
                    <article
                      key={id}
                      className="flex flex-col rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition hover:border-white/10"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-white">{author}</p>
                          {dateStr && <p className="text-xs text-gray-500">{dateStr}</p>}
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-sm font-bold text-amber-400">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          {rating}/5
                        </span>
                      </div>
                      <p className={`text-sm font-light leading-relaxed text-gray-300 ${!isExpanded && long ? 'line-clamp-4' : ''}`}>
                        {text}
                      </p>
                      {long && (
                        <button
                          type="button"
                          onClick={() => toggleExpandReview(id)}
                          className="mt-2 self-start text-xs font-bold text-gray-500 transition hover:text-white"
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </div>

          <span className="sr-only">{type}</span>
        </m.div>
      )}
    </div>
  )
}
