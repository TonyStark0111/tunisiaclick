import PosterCard from '@/src/components/PosterCard'
import { Row, SectionHeader } from '@/src/components/rows/Row'
import { cardProps } from '@/src/lib/card-props'
import { getT } from '@/src/lib/i18n/server'
import type { Top10 } from '@/src/lib/top10'

/** Ten posters, each standing on its rank in huge outlined numerals. */
export default function Top10Row({ top10 }: { top10: Top10 }) {
  const t = getT()
  if (top10.items.length < 5) return null
  const title = top10.source === 'site' ? t('home.top10Site') : t('home.top10World')
  return (
    <section aria-label={title}>
      <SectionHeader title={title} subtitle={top10.source === 'site' ? t('home.top10SiteNote') : t('home.top10WorldNote')} />
      <Row label={title} gap="gap-1 sm:gap-2" itemClassName="w-[min(50vw,280px)] max-w-[280px] sm:w-[260px] lg:w-[280px] 2xl:w-[300px]">
        {top10.items.map((item, index) => {
          const kind: 'movie' | 'tv' = item.media_type === 'tv' ? 'tv' : 'movie'
          return (
            <div key={`${kind}-${item.id}`} className="group/rank flex items-end">
              <span
                aria-label={t('home.rank', { rank: index + 1 })}
                className="numeral-outline relative -me-[8%] w-[46%] shrink-0 select-none text-end font-display text-[clamp(120px,min(14vw,38vh),220px)] font-extrabold leading-[0.85] tracking-[-0.04em] transition-[filter,transform] duration-300 group-hover/rank:brightness-110 group-hover/rank:-translate-y-0.5"
              >
                {index + 1}
              </span>
              <div className="relative w-[58%] shrink-0">
                <PosterCard {...cardProps(item, kind)} bare />
              </div>
            </div>
          )
        })}
      </Row>
    </section>
  )
}
