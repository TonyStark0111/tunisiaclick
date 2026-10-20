import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProviderById, PROVIDERS_LIST } from '@/src/lib/providers'
import { pageMetadata } from '@/src/lib/seo'
import ProviderExploreClient from '@/src/components/providers/ProviderExploreClient'

export const dynamic = 'force-dynamic'

type Props = {
  params: { id: string }
}

export function generateStaticParams() {
  return PROVIDERS_LIST.map((p) => ({ id: p.id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const provider = getProviderById(params.id)
  if (!provider) return { title: 'Provider not found' }
  return pageMetadata({
    title: provider.name,
    description: provider.tagline,
    path: `/exploreworld/${provider.id}`,
  })
}

/**
 * /exploreworld/[id]
 * Xilfflix-style: infinite scroll (swipe/scroll up loads more). No prev/next pagination.
 */
export default function ProviderDetailPage({ params }: Props) {
  const provider = getProviderById(params.id)
  if (!provider) notFound()

  return <ProviderExploreClient provider={provider} />
}
