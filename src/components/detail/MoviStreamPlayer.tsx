'use client'

/**
 * Browser-only Movi Player wrapper.
 * Plays any format movi-player supports (MKV, HEVC, AV1, HLS, DASH, …)
 * directly in Chrome / Firefox / Edge / Safari — no desktop app, no transcoding.
 *
 * Loads the official movi-player element from CDN on first use.
 *
 * MULTI-SOURCE / QUALITY SWITCHING:
 * When the `src` prop changes (user picks another quality/source), the player
 * attempts to preserve the current playback position so the viewer continues
 * roughly where they left off (e.g. 01:25:40 → same timestamp on the new stream).
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
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

/** Try to read currentTime from a movi-player (or nested <video>). */
function readCurrentTime(el: HTMLElement | null): number {
  if (!el) return 0
  // movi-player may expose currentTime directly or via a video child
  const any = el as any
  if (typeof any.currentTime === 'number' && !Number.isNaN(any.currentTime)) {
    return any.currentTime
  }
  const video = el.querySelector?.('video') as HTMLVideoElement | null
  if (video && typeof video.currentTime === 'number') {
    return video.currentTime
  }
  return 0
}

/** Try to seek a movi-player (or nested <video>) to a given time. */
function seekTo(el: HTMLElement | null, time: number): void {
  if (!el || time <= 0) return
  const any = el as any
  try {
    if (typeof any.currentTime === 'number') {
      any.currentTime = time
      return
    }
    const video = el.querySelector?.('video') as HTMLVideoElement | null
    if (video) {
      const doSeek = () => {
        try {
          video.currentTime = time
        } catch { /* ignore */ }
      }
      if (video.readyState >= 1) {
        doSeek()
      } else {
        video.addEventListener('loadedmetadata', doSeek, { once: true })
      }
    }
  } catch {
    // best-effort
  }
}

export type MoviStreamPlayerProps = {
  src: string
  title?: string
  poster?: string | null
  className?: string
  autoplay?: boolean
  /** When true (default), attempt to resume at the previous playback position after a source switch. */
  resumeOnSourceChange?: boolean
  onReady?: () => void
  onError?: (message: string) => void
  /** Called when the underlying player reports a timeupdate (throttled). */
  onTimeUpdate?: (seconds: number) => void
}

export default function MoviStreamPlayer({
  src,
  title,
  poster,
  className,
  autoplay = true,
  resumeOnSourceChange = true,
  onReady,
  onError,
  onTimeUpdate,
}: MoviStreamPlayerProps) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<HTMLElement | null>(null)
  const lastTimeRef = useRef(0)
  const prevSrcRef = useRef<string | null>(null)

  // Capture current time before the src changes
  useEffect(() => {
    if (prevSrcRef.current && prevSrcRef.current !== src && resumeOnSourceChange) {
      const t = readCurrentTime(playerRef.current)
      if (t > 2) {
        // only resume if we had meaningful progress
        lastTimeRef.current = t
      }
    }
    prevSrcRef.current = src
  }, [src, resumeOnSourceChange])

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

  // After the new player mounts, try to restore the previous position
  useEffect(() => {
    if (!ready || !resumeOnSourceChange || lastTimeRef.current <= 0) return
    const target = lastTimeRef.current
    // Give the custom element a moment to create its internal video
    const timers = [
      setTimeout(() => seekTo(playerRef.current, target), 400),
      setTimeout(() => seekTo(playerRef.current, target), 1200),
      setTimeout(() => seekTo(playerRef.current, target), 2500),
    ]
    return () => timers.forEach(clearTimeout)
  }, [ready, src, resumeOnSourceChange])

  // Optional timeupdate reporting
  useEffect(() => {
    if (!ready || !onTimeUpdate) return
    const el = playerRef.current
    if (!el) return

    let lastReported = 0
    const handler = () => {
      const t = readCurrentTime(el)
      if (Math.abs(t - lastReported) >= 1) {
        lastReported = t
        lastTimeRef.current = t
        onTimeUpdate(t)
      }
    }

    // Prefer listening on the element itself; fall back to nested video
    el.addEventListener?.('timeupdate', handler)
    const video = el.querySelector?.('video')
    video?.addEventListener('timeupdate', handler)

    return () => {
      el.removeEventListener?.('timeupdate', handler)
      video?.removeEventListener('timeupdate', handler)
    }
  }, [ready, src, onTimeUpdate])

  const setPlayerEl = useCallback((node: HTMLElement | null) => {
    playerRef.current = node
  }, [])

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
        ref={setPlayerEl as any}
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
