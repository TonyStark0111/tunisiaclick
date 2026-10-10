import ClientMessages from '@/src/components/ClientMessages'

/**
 * Same client translation keys as the TV pages (episodes, next episode, theater, extras…).
 * Without this, the watch page shows raw keys like "tv.episodes" / "detail.nextEpisode".
 */
export default function WatchTvLayout({ children }: { children: React.ReactNode }) {
  return <ClientMessages scope="tv/layout">{children}</ClientMessages>
}
