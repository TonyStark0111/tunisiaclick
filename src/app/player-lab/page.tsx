import type { Metadata } from 'next'
import PlayerLab from '@/src/components/player/PlayerLab'

export const metadata: Metadata = { title: 'Player lab', robots: { index: false, follow: false } }

export default function Page() {
  return <PlayerLab />
}
