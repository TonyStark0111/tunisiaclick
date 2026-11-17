'use client'

/**
 * Browser-only Movi Player wrapper.
 * Plays any format movi-player supports (MKV, HEVC, AV1, HLS, DASH, …)
 * directly in Chrome / Firefox / Edge / Safari — no desktop app, no transcoding.
 *
 * Loads the official movi-player element from CDN on first use.
 */

import React, { useEffect, useRef, useState } from 'react'
import { BrandLoader } from '@/src/components/brand/BrandMark'
import { cn } from '@/src/lib/utils'

const CDN_SCRIPT = 'https://cdn.jsdelivr.net/npm/movi-player/dist/element.global.js'
const SCRIPT_ID = 'movi-player-element-script'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'movi-player': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string
          controls?: boolean | string
          autoplay?: boolean | string
          muted?: boolean | string
          loop?: boolean | string
          preload?: string
          poster?: string
        },
        HTMLElement
      >
    }
  }
}

function ensureMoviScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (customElements.get('movi-player')) return Promise.resolve()
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    return new Promise((resolve, reject) => {
      if (customElements.get('movi-player')) return resolve()
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('movi-player script failed')), { once: true })
    })
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = CDN_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load movi-player from CDN'))
    document.head.appendChild(script)
  })
}

export type MoviStreamPlayerProps = {
  src: string
  title?: string
  poster?: string | null
  className?: string
  autoplay?: boolean
  onReady?: () => void
  onError?: (message: string) => void
}

export default function MoviStreamPlayer({
  src,
  title,
  poster,
  className,
  autoplay = true,
  onReady,
  onError,
}: MoviStreamPlayerProps) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setFailed(null)
    setReady(false)
    ensureMoviScript()
      .then(() => {
        if (cancelled) return
        setReady(true)
        onReady?.()
      })
      .catch((err) => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Movi Player failed to load'
        setFailed(msg)
        onError?.(msg)
      })
    return () => {
      cancelled = true
    }
  }, [src, onReady, onError])

  if (failed) {
    return (
      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center text-white',
          className,
        )}
      >
        <p className="text-sm font-medium text-red-300">Movi Player unavailable</p>
        <p className="max-w-md text-xs text-white/60">{failed}</p>
        <p className="text-xs text-white/40">Try another source or check your network.</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className={cn('absolute inset-0 flex items-center justify-center bg-black', className)}>
        <BrandLoader className="h-10 w-10" />
      </div>
    )
  }

  return (
    <div ref={hostRef} className={cn('absolute inset-0 h-full w-full', className)}>
      {/* @ts-expect-error custom element */}
      <movi-player
        key={src}
        src={src}
        controls
        autoplay={autoplay ? true : undefined}
        poster={poster || undefined}
        title={title}
        style={{ width: '100%', height: '100%', display: 'block', background: '#000' }}
      />
    </div>
  )
}
