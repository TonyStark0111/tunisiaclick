import type { Metadata } from 'next'
import PageHeader from '@/src/components/browse/PageHeader'
import ProviderRow from '@/src/components/providers/ProviderRow'
import { PROVIDERS_LIST, TMDB_LOGO_BASE } from '@/src/lib/providers'
import { pageMetadata } from '@/src/lib/seo'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => {
  return pageMetadata({
    title: 'Explore World',
    description:
      'Browse movies and TV shows by streaming provider — Netflix, Prime Video, Disney+, Apple TV+, Max, Hulu, Paramount+, Peacock, Starz, AMC+, Crunchyroll, MGM+.',
    path: '/exploreworld',
  })
}

/**
 * /exploreworld — Browse by streaming provider.
 * Provider catalogue imported from Xilfflix (TMDB watch providers).
 * Excludes YouTube, YouTube Premium, Tubi TV, Pluto TV.
 */
export default function ExploreWorldPage() {
  return (
    <div className="pb-16">
      <PageHeader
        title="Explore World"
        subtitle="Pick a streaming service and discover what’s available to watch."
      />

      {/* Primary horizontal “Browse by Provider” row (Xilfflix-style) */}
      <section className="mt-2 sm:mt-4">
        <ProviderRow title="Browse by Provider" basePath="/exploreworld" />
      </section>

      {/* Full grid of the same providers for easier scanning on large screens */}
      <section className="page-x mt-12 sm:mt-16">
        <h2 className="mb-6 font-display text-lg font-bold tracking-tight text-white sm:text-xl">
          All providers
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-6">
          {PROVIDERS_LIST.map((provider) => (
            <Link
              key={provider.id}
              href={`/exploreworld/${provider.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
              style={{
                boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
              }}
            >
              <div
                className="relative flex aspect-[16/10] items-center justify-center p-6 transition-shadow duration-300 group-hover:shadow-[0_0_28px_var(--glow)]"
                style={
                  {
                    backgroundColor: provider.bgColor,
                    ['--glow' as string]: provider.glowColor,
                  } as React.CSSProperties
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${TMDB_LOGO_BASE}${provider.logoPath}`}
                  alt=""
                  className="max-h-14 max-w-[70%] object-contain sm:max-h-16"
                  loading="lazy"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20" />
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3.5 sm:p-4">
                <p className="font-display text-[15px] font-semibold text-white group-hover:text-white">
                  {provider.name}
                </p>
                <p className="line-clamp-2 text-[12px] leading-snug text-white/45">
                  {provider.tagline}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
