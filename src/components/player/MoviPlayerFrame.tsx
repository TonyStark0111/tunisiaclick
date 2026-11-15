"use client"
import dynamic from 'next/dynamic'
import type { MoviConfig } from '@/src/lib/movi'
import { useI18n } from '@/src/components/I18nProvider'
import { BrandLoader } from '@/src/components/brand/BrandMark'

// Client-only: the Movi element can't be evaluated on the server.
const Inner = dynamic(() => import('@/src/components/player/MoviPlayerInner'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center bg-black">
      <BrandLoader tone="brand" className="h-11 w-11" />
    </div>
  ),
})

/**
 * Movi Player filling its parent (a `relative` 16:9 box, like the iframe it replaces).
 * `resumeKey` identifies the title/episode so each one remembers its own position.
 */
export default function MoviPlayerFrame(props: {
  config: MoviConfig
  title?: string
  resumeKey: string
  onLoaded?: () => void
  onNext?: () => void
  nextLabel?: string
  onEnded?: () => void
  onFailed?: (message: string | null) => void
  onErrorInfo?: (info: { title: string | null; message: string | null; canRetry: boolean; canTrySoftware: boolean }, el: any) => void
  /** The <movi-player> element: play, pause, seek (currentTime), volume, playbackRate, enableSoftwareDecoding(), getQoeSession()... */
  elementRef?: (el: any) => void
  onQoe?: (event: unknown) => void
  onTimeUpdate?: (time: number) => void
  onItemChange?: (detail: { index: number; previousIndex: number; item: unknown }, event: Event) => void
  events?: Record<string, (detail: any, event: Event) => void>
  className?: string
}) {
  const { locale } = useI18n()
  return <Inner {...props} locale={locale} />
}
