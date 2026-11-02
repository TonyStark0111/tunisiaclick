/**
 * Homepage “Cinematic Universes” rail — faithful port of Moviezonne’s universes-rail.
 *
 * Shows the 17 curated franchises as landscape cards with lockup wordmarks.
 * Tapping a card goes to /universes/[slug].
 *
 * Kids profiles: hidden (same policy as HubShelf).
 */
import Link from 'next/link'
import { Row, SectionHeader } from '@/src/components/rows/Row'
import TmdbImage from '@/src/components/TmdbImage'
import { getLocale, getT } from '@/src/lib/i18n/server'
import {
  UNIVERSES,
  getUniverseCatalog,
  universePath,
  ACCENT_COLORS,
  type UniverseMeta,
} from '@/src/lib/universes'
import { cn } from '@/src/lib/utils'

function pickKeyArt(slug: UniverseMeta['slug']): string | null {
  const { movies, tv } = getUniverseCatalog(slug)
  // Prefer a strong movie backdrop, then poster, then TV
  const candidates = [
    ...movies.map((m) => m.backdrop_path || m.poster_path),
    ...tv.map((t) => t.backdrop_path || t.poster_path),
  ].filter(Boolean) as string[]
  return candidates[0] ?? null
}

function UniverseCard({ universe }: { universe: UniverseMeta }) {
  const keyArt = pickKeyArt(universe.slug)
  const accent = ACCENT_COLORS[universe.accent]

  return (
    <Link
      href={universePath(universe.slug)}
      className={cn(
        'group/uv relative block aspect-[16/9] w-[min(72vw,280px)] shrink-0 overflow-hidden rounded-xl',
        'bg-white/[0.04] outline-none ring-1 ring-inset ring-white/[0.08]',
        'transition-transform duration-150 ease-out active:scale-[0.98]',
        'focus-visible:ring-2 focus-visible:ring-red-500',
      )}
      data-uv-slug={universe.slug}
    >
      {keyArt && (
        <TmdbImage
          kind="backdrop"
          path={keyArt}
          alt=""
          fill
          sizes="(min-width: 640px) 280px, 72vw"
          className="object-cover transition-transform duration-500 ease-out group-hover/uv:scale-[1.05]"
          draggable={false}
        />
      )}

      {/* Accent glow from bottom */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 50% 115%, rgb(${accent} / 0.55), transparent 62%)`,
        }}
      />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

      {/* Hover ring in accent colour */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 ease-out group-hover/uv:opacity-100"
        style={{
          boxShadow: `inset 0 0 0 2px rgb(${accent} / 0.9), inset 0 -50px 70px -40px rgb(${accent} / 0.4)`,
        }}
      />

      {/* Lockup */}
      <span className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
        <span
          className="block font-display text-[18px] font-extrabold leading-none tracking-tight text-white drop-shadow-[0_2px_12px_rgb(0_0_0/0.7)] sm:text-[20px]"
          style={{ textShadow: `0 0 24px rgb(${accent} / 0.45)` }}
        >
          {universe.mark}
        </span>
        <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/70 sm:text-[12px]">
          {universe.sub}
        </span>
      </span>
    </Link>
  )
}

export default async function CinematicUniversesRail({ kids = false }: { kids?: boolean }) {
  if (kids) return null

  const t = getT()
  // Title matches Moviezonne’s section heading
  const title = t('home.cinematicUniverses') || 'Cinematic Universes'
  const subtitle = t('home.cinematicUniversesNote') || 'Every major franchise, in order'

  return (
    <section aria-label={title} id="cinematic-universes">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        href="/universes"
      />
      <Row
        label={title}
        gap="gap-3 sm:gap-4"
        itemClassName="shrink-0"
      >
        {UNIVERSES.map((u) => (
          <UniverseCard key={u.slug} universe={u} />
        ))}
      </Row>
    </section>
  )
}
