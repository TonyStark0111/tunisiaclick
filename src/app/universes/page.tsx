import type { Metadata } from 'next'
import Link from 'next/link'
import { SectionHeader } from '@/src/components/rows/Row'
import TmdbImage from '@/src/components/TmdbImage'
import { getT } from '@/src/lib/i18n/server'
import {
  UNIVERSES,
  getUniverseCatalog,
  universePath,
  ACCENT_COLORS,
} from '@/src/lib/universes'
import { cn } from '@/src/lib/utils'

export const metadata: Metadata = {
  title: 'Cinematic Universes',
  description:
    'Explore every major cinematic universe in release order — MCU, DC, Star Wars, YRF Spy, Cop Universe, Wizarding World and more.',
  alternates: { canonical: '/universes' },
}

function pickKeyArt(slug: (typeof UNIVERSES)[number]['slug']) {
  const { movies, tv } = getUniverseCatalog(slug)
  const candidates = [
    ...movies.map((m) => m.backdrop_path || m.poster_path),
    ...tv.map((t) => t.backdrop_path || t.poster_path),
  ].filter(Boolean) as string[]
  return candidates[0] ?? null
}

export default function UniversesIndexPage() {
  const t = getT()
  const title = t('home.cinematicUniverses') || 'Cinematic Universes'
  const subtitle =
    t('home.cinematicUniversesNote') ||
    'Every major franchise, ordered from the first film to the latest'

  return (
    <div className="page-y">
      <div className="page-x mb-8 max-w-4xl">
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{title}</h1>
        <p className="mt-2 text-white/60">{subtitle}</p>
      </div>

      <div className="page-x grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {UNIVERSES.map((u) => {
          const keyArt = pickKeyArt(u.slug)
          const accent = ACCENT_COLORS[u.accent]
          const { movies, tv } = getUniverseCatalog(u.slug)
          const count = movies.length + tv.length

          return (
            <Link
              key={u.slug}
              href={universePath(u.slug)}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-2xl',
                'bg-white/[0.04] ring-1 ring-inset ring-white/[0.08]',
                'transition-transform duration-150 ease-out active:scale-[0.98]',
                'focus-visible:ring-2 focus-visible:ring-red-500',
              )}
            >
              <div className="relative aspect-[16/9] w-full">
                {keyArt && (
                  <TmdbImage
                    kind="backdrop"
                    path={keyArt}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 25vw, (min-width: 640px) 40vw, 90vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                )}
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(120% 90% at 50% 115%, rgb(${accent} / 0.5), transparent 62%)`,
                  }}
                />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              </div>

              <div className="relative -mt-10 px-4 pb-4 pt-2">
                <span
                  className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ background: `rgb(${accent} / 0.85)` }}
                >
                  {u.badge}
                </span>
                <h2 className="mt-2 font-display text-lg font-bold leading-tight text-white">{u.name}</h2>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-white/60">{u.tagline}</p>
                <p className="mt-2 text-[12px] text-white/40">
                  {count} title{count === 1 ? '' : 's'}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
