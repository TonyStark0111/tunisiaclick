"use client"
// The actual <movi-player>. Imported only through MoviPlayerFrame (dynamic, ssr:false): the custom
// element touches `HTMLElement` the moment it's imported, so it can't be evaluated on the server.
//
// The slim build is used: the JS is ~4 MB and the FFmpeg engine is a separate movi.wasm, served by
// this site from /movi/movi.wasm (scripts/sync-movi.mjs copies it from node_modules). If the wasm
// can't load, Movi falls back to the browser's own <video> by itself.
import { useEffect, useMemo, useRef } from 'react'
import { MoviPlayer, MoviSource, MoviTrack, type MoviElement } from 'movi-player/react/slim'
import type { MoviConfig } from '@/src/lib/movi'

export type MoviPlayerInnerProps = {
  config: MoviConfig
  title?: string
  /** Site language: picks default audio/subtitle language and namespaces nothing else. */
  locale?: string
  /** Key for "resume where you stopped" (one per movie / episode). */
  resumeKey: string
  onLoaded?: () => void
  onNext?: () => void
  nextLabel?: string
  onEnded?: () => void
  onFailed?: (message: string | null) => void
  /** The error screen's wording and which recoveries make sense (el.load() / el.enableSoftwareDecoding()). */
  onErrorInfo?: (info: { title: string | null; message: string | null; canRetry: boolean; canTrySoftware: boolean }, el: MoviElement | null) => void
  /** Playback telemetry (movi-qoe) and clock, for analytics / progress reporting. */
  onQoe?: (event: unknown) => void
  onTimeUpdate?: (time: number) => void
  /** The queue moved (a playlist item started). Call preventDefault() to take over navigation. */
  onItemChange?: (detail: { index: number; previousIndex: number; item: unknown }, event: Event) => void
  /** Any other player event by name: errordisplay, nativefallback, smoothwarning, filerevoked, qualitychange... */
  events?: Record<string, (detail: any, event: Event) => void>
  className?: string
  elementRef?: (el: MoviElement | null) => void
}

const NEXT_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>'

export default function MoviPlayerInner({
  config, title, locale, resumeKey, onLoaded, onNext, nextLabel, onEnded, onFailed, onErrorInfo, onQoe, onTimeUpdate, onItemChange, events, className, elementRef,
}: MoviPlayerInnerProps) {
  const el = useRef<MoviElement | null>(null)
  const nextRef = useRef(onNext)
  nextRef.current = onNext
  const loadedRef = useRef(onLoaded)
  loadedRef.current = onLoaded

  const headers = useMemo(() => (config.headers ? JSON.stringify(config.headers) : undefined), [config.headers])
  const chapters = useMemo(() => (config.chapters?.length ? JSON.stringify(config.chapters) : undefined), [config.chapters])
  // One source = `src`; a ladder / dubs / subtitles are <source>/<track> children (an element with
  // a `src` ignores its children, so `src` is only set when there are no qualities).
  const useChildren = !!config.qualities?.length

  const playlist = useMemo(() => (config.playlist?.length ? JSON.stringify(config.playlist) : undefined), [config.playlist])
  const eventsRef = useRef(events)
  eventsRef.current = events
  const itemRef = useRef(onItemChange)
  itemRef.current = onItemChange

  // Properties that have no attribute: storyboard, icons, host controls, extra event listeners.
  useEffect(() => {
    const node = el.current as any
    if (!node) return
    try { if (config.storyboard) node.storyboard = config.storyboard } catch { /* older build */ }
    try { for (const [name, svg] of Object.entries(config.icons ?? {})) node.setIcon?.(name, svg) } catch { /* unknown icon */ }
    const ids: string[] = []
    try {
      for (const spec of config.customControls ?? []) { node.addControl?.(spec); if (typeof spec.id === 'string') ids.push(spec.id) }
    } catch { /* a bad spec must not break playback */ }
    const listeners: Array<[string, EventListener]> = []
    const on = (name: string, fn: EventListener) => { node.addEventListener(name, fn); listeners.push([name, fn]) }
    on('itemchange', (e) => itemRef.current?.((e as CustomEvent).detail, e))
    for (const name of Object.keys(eventsRef.current ?? {})) {
      on(name, (e) => eventsRef.current?.[name]?.((e as CustomEvent).detail, e))
    }
    return () => {
      listeners.forEach(([n, l]) => node.removeEventListener(n, l))
      ids.forEach((id) => { try { node.removeControl?.(id) } catch { /* gone */ } })
    }
  }, [config.storyboard, config.icons, config.customControls, config.src, config.qualities])

  // The loading veil goes away on the first usable frame (or on failure: Movi shows its own error).
  useEffect(() => {
    const node = el.current
    if (!node) return
    const done = () => loadedRef.current?.()
    node.addEventListener('loadedmetadata', done)
    node.addEventListener('canplay', done)
    node.addEventListener('errordisplay', done)
    return () => {
      node.removeEventListener('loadedmetadata', done)
      node.removeEventListener('canplay', done)
      node.removeEventListener('errordisplay', done)
    }
  }, [config.src, config.qualities])

  // "Next episode" lives in the player's own bar, with the built-in controls.
  const hasNext = !!onNext
  useEffect(() => {
    const node = el.current as (MoviElement & { addControl?: (c: unknown) => void; removeControl?: (id: string) => void }) | null
    if (!node || !hasNext || typeof node.addControl !== 'function') return
    try {
      node.addControl({
        id: 'tf-next-episode',
        label: nextLabel ?? 'Next episode',
        icon: NEXT_ICON,
        placement: 'bar',
        onSelect: () => nextRef.current?.(),
      })
    } catch { /* an older build without addControl: the page's own button still works */ }
    return () => { try { node.removeControl?.('tf-next-episode') } catch { /* gone with the element */ } }
  }, [hasNext, nextLabel])

  return (
    <MoviPlayer
      ref={(node) => { el.current = node; elementRef?.(node) }}
      className={className}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      src={useChildren || playlist ? undefined : config.src}
      playlist={playlist}
      playlistindex={config.playlistIndex}
      autoadvance={config.autoAdvance}
      shuffle={config.shuffle}
      encrypted={config.encrypted ? true : undefined}
      tokenurl={config.encrypted?.tokenUrl}
      videourl={config.encrypted?.videoUrl}
      videoid={config.encrypted?.videoId}
      poster={config.poster}
      title={title}
      // --- everything Movi offers, on ---
      controls
      autoplay
      playsinline
      theme="dark"
      themecolor="#dc2626"
      showtitle
      thumb="precise"
      hdr
      ambientmode
      stablevolume
      smoothwarning
      subtitlepicker
      doubletap
      fastseek
      cropbars
      backgroundplay={false}
      // Remembered across films: volume, speed, ambient, stable volume, HDR, aspect, crop and the
      // viewer's audio / subtitle LANGUAGE (matched against each new file's tracks).
      persist="volume muted speed ambient stablevolume hdr aspect cropbars audiolang subtitlelang"
      persistkey="tunisiaclick"
      // Where the viewer stopped, per title / episode.
      resume
      resumekey={resumeKey}
      startat={config.startAt}
      // Anything Movi can't read is handed to the browser's <video> inside Movi's own controls.
      fallback="native"
      wasmurl="/movi/movi.wasm"
      headers={headers}
      chapters={chapters}
      drm={config.drm}
      licenseurl={config.licenseUrl}
      // Anything else Movi has: the host's `options` win over the defaults above.
      {...(config.options as Record<string, never>)}
      onQoe={onQoe as never}
      onTimeUpdate={onTimeUpdate}
      onEnded={onEnded}
      onErrorDisplay={(info) => { onFailed?.(info.message); onErrorInfo?.(info, el.current) }}
    >
      {config.qualities?.map((q) => (
        <MoviSource key={q.src} src={q.src} type={q.type} height={q.height} label={q.label ?? `${q.height}p`} fps={q.fps} badge={q.badge} bandwidth={q.bandwidth} codec={q.codec} default={q.default} />
      ))}
      {config.audio?.map((a) => (
        <MoviSource key={a.src} src={a.src} kind="audio" type={a.type} srcLang={a.lang} label={a.label} default={a.default} />
      ))}
      {config.subtitles?.map((s) => (
        <MoviTrack key={s.src} src={s.src} srcLang={s.lang} label={s.label} format={s.format} default={s.default} />
      ))}
      {config.thumbnails && <track kind="metadata" label="thumbnails" src={config.thumbnails} />}
    </MoviPlayer>
  )
}
