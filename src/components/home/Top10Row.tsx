import PosterCard from '@/src/components/PosterCard'
import { Row, SectionHeader } from '@/src/components/rows/Row'
import { cardProps } from '@/src/lib/card-props'
import { getT } from '@/src/lib/i18n/server'
import type { Top10 } from '@/src/lib/top10'

/**
 * Premium Top 10 rail — Moviezonne-style size, gold metallic ranks, and
 * poster overlap. Data still comes from TunisiaClick's getTop10 (site
 * community when available, otherwise TMDB weekly trending).
 */
export default function Top10Row({ top10 }: { top10: Top10 }) {
  const t = getT()
  if (top10.items.length < 5) return null
  const title = top10.source === 'site' ? t('home.top10Site') : t('home.top10World')
  return (
    <section className="top10-section" aria-label={title}>
      <SectionHeader
        title={title}
        subtitle={top10.source === 'site' ? t('home.top10SiteNote') : t('home.top10WorldNote')}
      />
      <Row
        label={title}
        gap="gap-[clamp(0.55rem,1.1vw,1.1rem)]"
        itemClassName="top10-card-item"
      >
        {top10.items.map((item, index) => {
          const rank = index + 1
          const kind: 'movie' | 'tv' = item.media_type === 'tv' ? 'tv' : 'movie'
          const isOutline = rank >= 4
          return (
            <div
              key={`${kind}-${item.id}`}
              className="top10-card group/rank"
              data-rank={rank}
              style={{ animationDelay: `${Math.min(index, 8) * 0.055}s` }}
            >
              <span
                aria-label={t('home.rank', { rank })}
                className={`top10-rank${isOutline ? ' top10-rank--outline' : ''}`}
              >
                {rank}
              </span>
              <div className="top10-poster-wrap">
                <PosterCard {...cardProps(item, kind)} bare className="top10-poster-card" />
              </div>
            </div>
          )
        })}
      </Row>
    </section>
  )
}
