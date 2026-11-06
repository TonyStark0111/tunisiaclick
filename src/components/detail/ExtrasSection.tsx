"use client"
// Extras: one chip selector for video groups (trailers, behind the scenes, clips, bloopers,
// recaps), Photos, and Reviews. Soundtrack stays below when matched. The section is left out
// when everything is empty. A soundtrack the server didn't know about yet is fetched as the
// section comes near and renders in place (the page's section nav only lists what the server knew).
import { useMemo, useState } from 'react'
import { Row, ROW_WIDTH, SectionHeader } from '@/src/components/rows/Row'
import { Chip, ChipGroup } from '@/src/components/ui/chip'
import VideoTile from '@/src/components/media/VideoTile'
import YouTubeDialog from '@/src/components/media/YouTubeDialog'
import { useI18n } from '@/src/components/I18nProvider'
import type { ExtrasGroup, ExtrasGroupId } from '@/src/lib/extras'
import type { TKey } from '@/src/lib/i18n'
import type { useSoundtrack } from '@/src/hooks/use-soundtrack'
import SoundtrackSection from './SoundtrackSection'
import PhotosGallery, { type GalleryImage } from './PhotosGallery'
import ReviewsSection from './ReviewsSection'

const PANEL = 'extras-panel'

type TabId = ExtrasGroupId | 'photos' | 'reviews'

export default function ExtrasSection({
  type,
  id,
  title,
  kids,
  groups,
  soundtrack,
  backdrops = [],
  posters = [],
  releaseDate,
  voteAverage,
  genres = [],
}: {
  type: 'movie' | 'tv'
  id: string
  title: string
  kids: boolean
  groups: ExtrasGroup[]
  soundtrack: ReturnType<typeof useSoundtrack>
  backdrops?: GalleryImage[]
  posters?: GalleryImage[]
  releaseDate?: string
  voteAverage?: number
  genres?: string[]
}) {
  const { t } = useI18n()
  const hasPhotos = backdrops.length > 0 || posters.length > 0
  const hasReviews = Boolean(title?.trim()) && !kids
  const photoCount = backdrops.length + Math.min(posters.length, 18)

  const tabs = useMemo(() => {
    const list: { id: TabId; label: string; count?: number }[] = []
    for (const entry of groups) {
      list.push({
        id: entry.id,
        label: t(`extras.group.${entry.id}` as TKey),
        count: entry.videos.length,
      })
    }
    if (hasPhotos) {
      list.push({ id: 'photos', label: t('extras.photos' as TKey), count: photoCount })
    }
    if (hasReviews) {
      list.push({ id: 'reviews', label: t('extras.reviews' as TKey) })
    }
    return list
  }, [groups, hasPhotos, hasReviews, photoCount, t])

  const [tabId, setTabId] = useState<TabId | null>(() => tabs[0]?.id ?? null)
  // Keep selection valid if tabs change (e.g. kids profile).
  const activeTab: TabId | null = tabs.some((tab) => tab.id === tabId) ? tabId : (tabs[0]?.id ?? null)

  const [dialog, setDialog] = useState<{ open: boolean, index: number }>({ open: false, index: 0 })
  const videoGroup = groups.find((entry) => entry.id === activeTab)
  const videos = videoGroup?.videos ?? []
  const album = soundtrack.status === 'found' ? soundtrack.album : null
  const isVideoTab = activeTab !== null && activeTab !== 'photos' && activeTab !== 'reviews'

  // Nothing to show (yet): only the soundtrack's sentinel, while it may still turn up.
  if (tabs.length === 0 && !album) {
    return soundtrack.status === 'unknown' ? <div ref={soundtrack.sentinel} aria-hidden className="h-px" /> : null
  }

  const dialogVideos = videos.map((video) => ({
    key: video.key,
    title: video.name || t(`extras.type.${video.type}` as TKey),
    subtitle: t(`extras.type.${video.type}` as TKey),
  }))

  return (
    <section id="extras" aria-labelledby="extras-title" className="scroll-mt-[calc(var(--topbar)+72px)] space-y-8">
      <div>
        <SectionHeader title={<span id="extras-title">{t('extras.title')}</span>} />

        {tabs.length > 0 && (
          <>
            {/* Always show the selector when Photos/Reviews exist or there is more than one video group. */}
            {(tabs.length > 1 || hasPhotos || hasReviews) && (
              <div className="page-x mb-4">
                <ChipGroup label={t('extras.groups')} mode="tabs" scroll>
                  {tabs.map((tab) => (
                    <Chip
                      key={tab.id}
                      active={tab.id === activeTab}
                      controls={PANEL}
                      count={tab.count}
                      onClick={() => setTabId(tab.id)}
                    >
                      {tab.label}
                    </Chip>
                  ))}
                </ChipGroup>
              </div>
            )}

            <div
              id={PANEL}
              role="tabpanel"
              aria-label={tabs.find((tab) => tab.id === activeTab)?.label}
            >
              {isVideoTab && videos.length > 0 && (
                <Row key={activeTab} itemClassName={ROW_WIDTH.landscape} label={t('extras.videos')}>
                  {videos.map((video, index) => (
                    <VideoTile
                      key={video.key}
                      videoKey={video.key}
                      title={video.name || t(`extras.type.${video.type}` as TKey)}
                      meta={<span>{t(`extras.type.${video.type}` as TKey)}</span>}
                      onPlay={() => setDialog({ open: true, index })}
                    />
                  ))}
                </Row>
              )}

              {activeTab === 'photos' && hasPhotos && (
                <PhotosGallery backdrops={backdrops} posters={posters} title={title} embedded />
              )}

              {activeTab === 'reviews' && hasReviews && (
                <ReviewsSection
                  title={title}
                  date={releaseDate}
                  type={type}
                  tmdbRating={voteAverage}
                  genres={genres}
                  embedded
                />
              )}
            </div>
          </>
        )}
      </div>

      {album ? (
        <SoundtrackSection type={type} id={id} kids={kids} album={album} tracks={soundtrack.tracks} failed={soundtrack.failed} />
      ) : soundtrack.status === 'unknown' ? (
        <div ref={soundtrack.sentinel} aria-hidden className="h-px" />
      ) : null}

      {isVideoTab && videos.length > 0 && (
        <YouTubeDialog
          open={dialog.open}
          onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
          videos={dialogVideos}
          index={dialog.index}
          onIndexChange={(index) => setDialog((current) => ({ ...current, index }))}
          label={t('extras.dialog', { title })}
          external={!kids}
        />
      )}
    </section>
  )
}
