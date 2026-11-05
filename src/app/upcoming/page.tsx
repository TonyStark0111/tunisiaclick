import type { Metadata } from 'next'
import PageHeader from '@/src/components/browse/PageHeader'
import UpcomingReleases from '@/src/components/home/UpcomingReleases'
import { getUpcomingReleases } from '@/src/lib/upcoming-releases'
import { getLocale, getT } from '@/src/lib/i18n/server'
import { catalogueLanguage } from '@/src/lib/tmdb-locale'
import { pageMetadata } from '@/src/lib/seo'

export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => {
  const t = getT()
  return pageMetadata({
    title: t('upcoming.title'),
    description: t('upcoming.subtitle'),
    path: '/upcoming',
    card: 'upcoming',
  })
}

/**
 * Full Upcoming Releases page — same MovieZone-style cards as the home teaser,
 * but the complete list (up to 36 titles in the next ~3 months).
 */
export default async function UpcomingPage() {
  const locale = getLocale()
  const t = getT()
  const items = await getUpcomingReleases(catalogueLanguage(locale), 36)

  return (
    <div className="pb-10">
      <PageHeader title={t('upcoming.title')} subtitle={t('upcoming.subtitle')} />
      <UpcomingReleases items={items} limit={36} showHeading={false} />
    </div>
  )
}
