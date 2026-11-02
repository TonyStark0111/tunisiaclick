import PosterCard from '@/src/components/PosterCard'
import { Row, SectionHeader } from '@/src/components/rows/Row'
import { cardProps } from '@/src/lib/card-props'
import { getT } from '@/src/lib/i18n/server'
import type { Top10 } from '@/src/lib/top10'

/** Ten posters, each standing on its rank in huge outlined numerals.
 *  Sizes matched 1:1 to Moviezonne (--t10-poster-w / --t10-rank-scale / --t10-overhang)
 */
export default function Top10Row({ top10 }: { top10: Top10 }) {
  const t = getT()
  if (top10.items.length < 5) return null
  const title = top10.source === 'site' ? t('home.top10Site') : t('home.top10World')
  return (
    <section aria-label={title}>
      <SectionHeader
        title={title}
        subtitle={top10.source === 'site' ? t('home.top10SiteNote') : t('home.top10WorldNote')}
      />
      <Row
        label={title}
        gap="gap-1 sm:gap-2"
        /* total card width = poster + 33 % overhang (Moviezonne size) */
        itemClassName="w-[clamp(175px,min(20.6vw,53.2vh),332px)]"
      >
        {top10.items.map((item, index) => {
          const kind: 'movie' | 'tv' = item.media_type === 'tv' ? 'tv' : 'movie'
          return (
            <div key={`\( {kind}- \){item.id}`} className="group/rank relative flex items-end">
              {/* Rank number – Moviezonne scale 1.2 × poster-w */}
              <span
                aria-label={t('home.rank', { rank: index + 1 })}
                className="numeral-outline relative z-[1] -me-[8%] w-[46%] shrink-0 select-none text-end font-display text-[clamp(158px,min(18.6vw,48vh),300px)] font-extrabold leading-[0.85] tracking-[-0.04em] transition-[filter,transform] duration-300 group-hover/rank:brightness-110 group-hover/rank:-translate-y-0.5"
              >
                {index + 1}
              </span>
              {/* Poster – Moviezonne --t10-poster-w */}
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
