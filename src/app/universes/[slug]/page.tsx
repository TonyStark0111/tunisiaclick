import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PosterCard from '@/src/components/PosterCard'
import TmdbImage from '@/src/components/TmdbImage'
import { SectionHeader } from '@/src/components/rows/Row'
import { cardProps } from '@/src/lib/card-props'
import { getT } from '@/src/lib/i18n/server'
import {
  getUniverse,
  getUniverseTimeline,
  isUniverseSlug,
  ACCENT_COLORS,
  type UniverseSlug,
} from '@/src/lib/universes'
import { cn } from '@/src/lib/utils'

type Props = { params: { slug: string } }

export function generateStaticParams() {
  // Pre-render all 17 universes
  return [
    'mcu', 'dceu', 'x-men', 'yrf-spy', 'jurassic-park', 'cop-universe',
    'star-wars', 'transformers', 'conjuring', 'fast-furious', 'james-bond',
    'terminator', 'wizarding-world', 'middle-earth', 'mission-impossible',
    'predator', 'maddock',
  ].map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isUniverseSlug(params.slug)) return { title: 'Universe not found' }
  const u = getUniverse(params.slug)!
  const timeline = getUniverseTimeline(params.slug)
  const n = timeline.length
  return {
    title: `${u.name} in Order`,
    description: u.tagline + (n ? ` ${n} films & series in release order.` : ''),
    alternates: { canonical: `/universes/${params.slug}` },
  }
}

export default function UniversePage({ params }: Props) {
  if (!isUniverseSlug(params.slug)) notFound()

  const slug = params.slug as UniverseSlug
  const universe = getUniverse(slug)!
  const timeline = getUniverseTimeline(slug)
  const accent = ACCENT_COLORS[universe.accent]
  const t = getT()

  const movies = timeline.filter((i) => i.media_type === 'movie')
  const series = timeline.filter((i) => i.media_type === 'tv')
  const hero = timeline.find((i) => i.backdrop_path) || timeline[0]

  const years = timeline
    .map((i) => (i.release_date || i.first_air_date || '').slice(0, 4))
    .filter(Boolean)
  const span =
    years.length > 1
      ? years[0] === years[years.length - 1]
        ? years[0]
        : `${years[0]} – ${years[years.length - 1]}`
      : years[0] || ''

  return (
    <div className="page-y">
      {/* Hero */}
      <div className="relative mb-8 min-h-[280px] w-full overflow-hidden sm:min-h-[360px]">
        {hero?.backdrop_path && (
          <TmdbImage
            kind="backdrop"
            path={hero.backdrop_path}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, rgb(0 0 0 / 0.95) 0%, rgb(0 0 0 / 0.6) 40%, rgb(0 0 0 / 0.3) 100%), radial-gradient(ellipse at 30% 80%, rgb(${accent} / 0.35), transparent 55%)`,
          }}
        />
        <div className="page-x relative flex h-full min-h-[280px] flex-col justify-end pb-8 pt-24 sm:min-h-[360px]">
          <span
            className="mb-3 inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white"
            style={{ background: `rgb(${accent} / 0.9)` }}
          >
            {universe.badge}
          </span>
          <h1 className="font-display text-3xl font-bold leading-tight text-white sm:text-5xl">
            {universe.name}
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/75 sm:text-base">
            {universe.tagline}
          </p>
          <p className="mt-3 text-sm text-white/50">
            {timeline.length} title{timeline.length === 1 ? '' : 's'}
            {span ? ` · ${span}` : ''}
            {movies.length > 0 && series.length > 0
              ? ` · ${movies.length} films · ${series.length} series`
              : ''}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="page-x">
        <SectionHeader
          title={t('universes.inOrder') || 'In release order'}
          subtitle={
            t('universes.inOrderNote') ||
            'Every film and series in the official chronological / release order'
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {timeline.map((item, index) => {
            const kind = item.media_type
            const title = item.title || item.name || 'Untitled'
            const year = (item.release_date || item.first_air_date || '').slice(0, 4)

            return (
              <div key={`${kind}-${item.id}`} className="relative">
                {/* Order number */}
                <span
                  className="absolute -start-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-lg"
                  style={{ background: `rgb(${accent})` }}
                >
                  {index + 1}
                </span>
                <PosterCard
                  {...cardProps(item, kind)}
                  bare={false}
                />
              </div>
            )
          })}
        </div>

        {timeline.length === 0 && (
          <p className="py-12 text-center text-white/50">
            No titles listed for this universe yet.
          </p>
        )}
      </div>

      {/* Back link */}
      <div className="page-x mt-12">
        <Link
          href="/universes"
          className="inline-flex items-center gap-1 text-sm text-white/55 transition-colors hover:text-white"
        >
          ← {t('universes.all') || 'All cinematic universes'}
        </Link>
      </div>
    </div>
  )
}
