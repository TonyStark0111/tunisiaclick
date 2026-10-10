import ClientMessages from '@/src/components/ClientMessages'

/**
 * Same client translation keys as the movie detail page (player, extras, cast, ratings…).
 * Without this, the watch page shows raw keys like "detail.watch".
 */
export default function WatchMovieLayout({ children }: { children: React.ReactNode }) {
  return <ClientMessages scope="movie/[id]/layout">{children}</ClientMessages>
}
