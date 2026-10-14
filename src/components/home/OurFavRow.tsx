import { PosterSlider } from '@/src/components/Sliders'
import { getOurFavRow } from '@/src/lib/our-fav'
import { getLocale } from '@/src/lib/i18n/server'
import { catalogueLanguage } from '@/src/lib/tmdb-locale'

/**
 * Home row: Our Fav — only titles with manual download links.
 * Placed after Coming Soon (inspired by seasonal rows like Halloween).
 */
export default async function OurFavRow() {
  const items = await getOurFavRow(20, catalogueLanguage(getLocale()))
  if (items.length === 0) return null

  return (
    <PosterSlider
      title="Our Fav"
      subtitle="Hand-picked titles with download links"
      href="/our-fav"
      items={items}
      kind="mixed"
    />
  )
}
