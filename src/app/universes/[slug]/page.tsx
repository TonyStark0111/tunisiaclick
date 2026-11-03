import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  getUniverse,
  getUniverseTimeline,
  isUniverseSlug,
  ACCENT_COLORS,
  type UniverseSlug,
} from '@/src/lib/universes'
import UniverseDetailClient from '@/src/components/universes/UniverseDetailClient'

type Props = { params: { slug: string } }

export function generateStaticParams() {
  // Pre-render all 17 universes
  return [
    'mcu',
    'dceu',
    'x-men',
    'yrf-spy',
    'jurassic-park',
    'cop-universe',
    'star-wars',
    'transformers',
    'conjuring',
    'fast-furious',
    'james-bond',
    'terminator',
    'wizarding-world',
    'middle-earth',
    'mission-impossible',
    'predator',
    'maddock',
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
  const accentRgb = ACCENT_COLORS[universe.accent] || '245 197 24'

  return (
    <UniverseDetailClient
      universe={universe}
      timeline={timeline}
      accentRgb={accentRgb}
    />
  )
}
