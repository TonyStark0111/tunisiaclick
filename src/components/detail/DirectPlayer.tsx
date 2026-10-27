"use client"
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type Hls from 'hls.js'
import {
    Captions, Check, Maximize, Minimize, Pause, PictureInPicture2, Play, RotateCcw, RotateCw, Settings,
    Volume2, VolumeX,
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { BrandLoader } from '@/src/components/brand/BrandMark'

export type DirectTrack = { src: string; label: string; srclang: string; default?: boolean }

type Props = {
    /** A direct media file: .mp4 / .webm, or an HLS playlist (.m3u8). Not an embed page. */
    src: string
    title?: string
    poster?: string
    /** Where the position is remembered (localStorage). Omit to not remember. */
    resumeKey?: string
    /** Side-loaded subtitles (WebVTT). HLS subtitle tracks are picked up automatically. */
    tracks?: DirectTrack[]
    onReady?: () => void
    onError?: () => void
    onEnded?: () => void
    className?: string
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const HIDE_AFTER_MS = 3000
const SAVE_EVERY_MS = 5000

/** Whether a URL is a media file this player can play (vs an embed page for an iframe). */
export function isDirectMediaUrl(url?: string | null): boolean {
    if (!url) return false
    try {
        return /\.(m3u8|mp4|webm|m4v|mov)$/i.test(new URL(url, 'http://x').pathname)
    } catch {
        return false
    }
}

const clock = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
    const s = Math.floor(seconds)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const r = String(s % 60).padStart(2, '0')
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`
}

const store = {
    get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
    set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } },
    del: (k: string) => { try { localStorage.removeItem(k) } catch { /* private mode */ } },
}

/**
 * The site's own player for direct video files (MP4 / WebM / HLS): custom controls over a native
 * <video>, hls.js for .m3u8 (native HLS on Safari), quality + speed + subtitles menu, ±10 s,
 * volume, picture in picture, full screen, keyboard shortcuts and resume. The forwarded ref is the
 * focusable frame (so the TV mode's focus hand-off works as it does for the iframe players).
 */
const DirectPlayer = forwardRef<HTMLDivElement, Props>(function DirectPlayer(
    { src, title, poster, resumeKey, tracks, onReady, onError, onEnded, className },
    forwardedRef,
) {
    const frameRef = useRef<HTMLDivElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const hlsRef = useRef<Hls | null>(null)
    const hideTimer = useRef<number | undefined>(undefined)
    useImperativeHandle(forwardedRef, () => frameRef.current as HTMLDivElement)

    const [playing, setPlaying] = useState(false)
    const [waiting, setWaiting] = useState(true)
    const [failed, setFailed] = useState(false)
    const [current, setCurrent] = useState(0)
    const [duration, setDuration] = useState(0)
    const [buffered, setBuffered] = useState(0)
    const [volume, setVolume] = useState(1)
    const [muted, setMuted] = useState(false)
    const [rate, setRate] = useState(1)
    const [fullscreen, setFullscreen] = useState(false)
    const [controls, setControls] = useState(true)
    const [menu, setMenu] = useState<null | 'main' | 'quality' | 'speed' | 'subs'>(null)
    const [levels, setLevels] = useState<number[]>([]) // heights, best first
    const [level, setLevel] = useState(-1) // -1 = auto
    const [subs, setSubs] = useState<{ index: number; label: string }[]>([])
    const [sub, setSub] = useState(-1) // -1 = off

    const callbacks = useRef({ onReady, onError, onEnded })
    callbacks.current = { onReady, onError, onEnded }

    // --- load the source (hls.js is only downloaded when a playlist needs it) ---
    useEffect(() => {
        const video = videoRef.current
        if (!video) return
        let cancelled = false
        setFailed(false)
        setWaiting(true)
        setPlaying(false)
        setLevels([])
        setLevel(-1)

        const resume = resumeKey ? Number(store.get(`tf-pos:${resumeKey}`)) || 0 : 0
        const seekToResume = () => {
            if (resume > 5) { try { video.currentTime = resume } catch { /* not seekable yet */ } }
        }
        const fail = () => { if (!cancelled) { setFailed(true); setWaiting(false); callbacks.current.onError?.() } }

        const isHls = /\.m3u8$/i.test(new URL(src, 'http://x').pathname)
        if (isHls && !video.canPlayType('application/vnd.apple.mpegurl')) {
            import('hls.js').then(({ default: HlsLib }) => {
                if (cancelled) return
                if (!HlsLib.isSupported()) return fail()
                const hls = new HlsLib({ enableWorker: true, backBufferLength: 60 })
                hlsRef.current = hls
                hls.loadSource(src)
                hls.attachMedia(video)
                hls.on(HlsLib.Events.MANIFEST_PARSED, (_e, data) => {
                    const heights = Array.from(new Set(data.levels.map((l) => l.height).filter(Boolean))).sort((a, b) => b - a)
                    setLevels(heights)
                    seekToResume()
                })
                hls.on(HlsLib.Events.SUBTITLE_TRACKS_UPDATED, (_e, data) => {
                    setSubs(data.subtitleTracks.map((t, index) => ({ index, label: t.name || t.lang || `Track ${index + 1}` })))
                })
                hls.on(HlsLib.Events.ERROR, (_e, data) => {
                    if (!data.fatal) return
                    if (data.type === HlsLib.ErrorTypes.NETWORK_ERROR) hls.startLoad()
                    else if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
                    else { hls.destroy(); fail() }
                })
            }).catch(fail)
        } else {
            video.src = src
            video.load()
        }

        const onMeta = () => seekToResume()
        video.addEventListener('loadedmetadata', onMeta)
        return () => {
            cancelled = true
            video.removeEventListener('loadedmetadata', onMeta)
            hlsRef.current?.destroy()
            hlsRef.current = null
            video.removeAttribute('src')
            video.load()
        }
    }, [src, resumeKey])

    // --- remember the position ---
    useEffect(() => {
        if (!resumeKey) return
        const key = `tf-pos:${resumeKey}`
        const timer = window.setInterval(() => {
            const v = videoRef.current
            if (!v || v.paused || !v.duration) return
            if (v.currentTime > 5 && v.currentTime < v.duration - 30) store.set(key, String(Math.floor(v.currentTime)))
        }, SAVE_EVERY_MS)
        return () => window.clearInterval(timer)
    }, [resumeKey])

    // --- controls visibility ---
    const wake = useCallback(() => {
        setControls(true)
        window.clearTimeout(hideTimer.current)
        hideTimer.current = window.setTimeout(() => {
            if (videoRef.current && !videoRef.current.paused) { setControls(false); setMenu(null) }
        }, HIDE_AFTER_MS)
    }, [])
    useEffect(() => () => window.clearTimeout(hideTimer.current), [])

    useEffect(() => {
        const onChange = () => setFullscreen(document.fullscreenElement === frameRef.current)
        document.addEventListener('fullscreenchange', onChange)
        return () => document.removeEventListener('fullscreenchange', onChange)
    }, [])

    // --- actions ---
    const toggle = useCallback(() => {
        const v = videoRef.current
        if (!v) return
        if (v.paused) v.play().catch(() => {})
        else v.pause()
    }, [])
    const seekBy = useCallback((delta: number) => {
        const v = videoRef.current
        if (!v) return
        v.currentTime = Math.max(0, Math.min(v.duration || Infinity, v.currentTime + delta))
        wake()
    }, [wake])
    const toggleFullscreen = useCallback(() => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
        else frameRef.current?.requestFullscreen?.().catch(() => {})
    }, [])
    const toggleMute = useCallback(() => {
        const v = videoRef.current
        if (v) v.muted = !v.muted
    }, [])
    const pip = () => {
        const v = videoRef.current
        if (!v) return
        if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {})
        else v.requestPictureInPicture?.().catch(() => {})
    }
    const pickLevel = (height: number) => {
        const hls = hlsRef.current
        if (!hls) return
        const index = height < 0 ? -1 : hls.levels.findIndex((l) => l.height === height)
        hls.currentLevel = index
        setLevel(height)
        setMenu(null)
    }
    const pickSpeed = (value: number) => {
        if (videoRef.current) videoRef.current.playbackRate = value
        setMenu(null)
    }
    const pickSub = (index: number) => {
        const hls = hlsRef.current
        const video = videoRef.current
        if (hls && subs.length) hls.subtitleTrack = index
        if (video) {
            const list = Array.from(video.textTracks).filter((t) => t.kind === 'subtitles' || t.kind === 'captions')
            list.forEach((t, i) => { t.mode = i === index ? 'showing' : 'disabled' })
        }
        setSub(index)
        setMenu(null)
    }

    const onKeyDown = (event: React.KeyboardEvent) => {
        if ((event.target as HTMLElement).tagName === 'INPUT') return
        switch (event.key) {
            case ' ': case 'k': event.preventDefault(); toggle(); break
            case 'ArrowRight': event.preventDefault(); seekBy(10); break
            case 'ArrowLeft': event.preventDefault(); seekBy(-10); break
            case 'f': toggleFullscreen(); break
            case 'm': toggleMute(); break
            default: return
        }
        wake()
    }

    const subtitleChoices = subs.length
        ? subs
        : (tracks ?? []).map((t, index) => ({ index, label: t.label }))
    const progress = duration ? (current / duration) * 100 : 0

    const iconBtn = 'grid h-9 w-9 place-items-center rounded-full text-white outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-red-500'

    return (
        <div
            ref={frameRef}
            tabIndex={0}
            role="region"
            aria-label={title}
            onKeyDown={onKeyDown}
            onMouseMove={wake}
            onTouchStart={wake}
            className={cn('group absolute inset-0 select-none bg-black outline-none', !controls && playing && 'cursor-none', className)}
        >
            <video
                ref={videoRef}
                poster={poster}
                playsInline
                preload="metadata"
                crossOrigin="anonymous"
                className="h-full w-full bg-black object-contain"
                onClick={() => { if (menu) setMenu(null); else toggle(); wake() }}
                onDoubleClick={toggleFullscreen}
                onPlay={() => { setPlaying(true); wake() }}
                onPause={() => { setPlaying(false); setControls(true) }}
                onWaiting={() => setWaiting(true)}
                onPlaying={() => setWaiting(false)}
                onLoadedMetadata={() => { setWaiting(false); callbacks.current.onReady?.() }}
                onCanPlay={() => setWaiting(false)}
                onTimeUpdate={(e) => {
                    const v = e.currentTarget
                    setCurrent(v.currentTime)
                    if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1))
                }}
                onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
                onVolumeChange={(e) => { setVolume(e.currentTarget.volume); setMuted(e.currentTarget.muted) }}
                onRateChange={(e) => setRate(e.currentTarget.playbackRate)}
                onEnded={() => { if (resumeKey) store.del(`tf-pos:${resumeKey}`); callbacks.current.onEnded?.() }}
                onError={() => { if (!hlsRef.current) { setFailed(true); setWaiting(false); callbacks.current.onError?.() } }}
            >
                {(tracks ?? []).map((t) => (
                    <track key={t.src} kind="subtitles" src={t.src} label={t.label} srcLang={t.srclang} />
                ))}
            </video>

            {waiting && !failed && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <BrandLoader tone="brand" className="h-11 w-11" />
                </div>
            )}

            {failed && (
                <div role="alert" className="absolute inset-0 grid place-items-center bg-black/80 px-6 text-center text-sm text-white/75">
                    <p>{title ? `${title}: ` : ''}this file could not be played. Try another source below.</p>
                </div>
            )}

            {/* Big play button while paused */}
            {!playing && !waiting && !failed && (
                <button type="button" onClick={toggle} aria-label="Play" className="absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md">
                    <Play aria-hidden className="ms-1 h-7 w-7 fill-current" />
                </button>
            )}

            {/* Control bar */}
            <div
                className={cn(
                    'absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2 pt-10 transition-opacity duration-200',
                    controls || !playing ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
                dir="ltr"
            >
                {/* Seek bar: buffered under played */}
                <div className="group/seek relative mb-1 h-5">
                    <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/20 group-hover/seek:h-1.5">
                        <div className="absolute inset-y-0 start-0 rounded-full bg-white/30" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
                        <div className="absolute inset-y-0 start-0 rounded-full bg-red-600" style={{ width: `${progress}%` }} />
                    </div>
                    <input
                        type="range"
                        aria-label="Seek"
                        min={0}
                        max={duration || 0}
                        step={0.1}
                        value={current}
                        onChange={(e) => { if (videoRef.current) videoRef.current.currentTime = Number(e.target.value) }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                </div>

                <div className="flex items-center gap-1">
                    <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className={iconBtn}>
                        {playing ? <Pause aria-hidden className="h-5 w-5 fill-current" /> : <Play aria-hidden className="h-5 w-5 fill-current" />}
                    </button>
                    <button type="button" onClick={() => seekBy(-10)} aria-label="Back 10 seconds" className={iconBtn}><RotateCcw aria-hidden className="h-[18px] w-[18px]" /></button>
                    <button type="button" onClick={() => seekBy(10)} aria-label="Forward 10 seconds" className={iconBtn}><RotateCw aria-hidden className="h-[18px] w-[18px]" /></button>

                    <div className="hidden items-center sm:flex">
                        <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className={iconBtn}>
                            {muted || volume === 0 ? <VolumeX aria-hidden className="h-5 w-5" /> : <Volume2 aria-hidden className="h-5 w-5" />}
                        </button>
                        <input
                            type="range"
                            aria-label="Volume"
                            min={0}
                            max={1}
                            step={0.05}
                            value={muted ? 0 : volume}
                            onChange={(e) => {
                                const v = videoRef.current
                                if (!v) return
                                v.volume = Number(e.target.value)
                                v.muted = Number(e.target.value) === 0
                            }}
                            className="h-1 w-20 cursor-pointer accent-red-600"
                        />
                    </div>

                    <span className="ms-2 whitespace-nowrap text-xs tabular-nums text-white/80">{clock(current)} / {clock(duration)}</span>

                    <div className="ms-auto flex items-center gap-1">
                        {subtitleChoices.length > 0 && (
                            <button type="button" onClick={() => setMenu(menu === 'subs' ? null : 'subs')} aria-label="Subtitles" aria-pressed={sub >= 0} className={cn(iconBtn, sub >= 0 && 'text-red-400')}>
                                <Captions aria-hidden className="h-5 w-5" />
                            </button>
                        )}
                        <button type="button" onClick={() => setMenu(menu ? null : 'main')} aria-label="Settings" className={iconBtn}><Settings aria-hidden className="h-5 w-5" /></button>
                        {typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && (
                            <button type="button" onClick={pip} aria-label="Picture in picture" className={cn(iconBtn, 'hidden sm:grid')}><PictureInPicture2 aria-hidden className="h-5 w-5" /></button>
                        )}
                        <button type="button" onClick={toggleFullscreen} aria-label="Full screen" className={iconBtn}>
                            {fullscreen ? <Minimize aria-hidden className="h-5 w-5" /> : <Maximize aria-hidden className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Settings / quality / speed / subtitles menu */}
            {menu && (
                <div dir="ltr" className="absolute bottom-16 end-3 z-20 min-w-[170px] overflow-hidden rounded-xl bg-black/90 py-1 text-sm text-white shadow-xl ring-1 ring-white/15 backdrop-blur-md">
                    {menu === 'main' && (
                        <>
                            {levels.length > 0 && (
                                <button type="button" onClick={() => setMenu('quality')} className="flex w-full items-center justify-between gap-6 px-4 py-2 hover:bg-white/10">
                                    <span>Quality</span><span className="text-white/60">{level < 0 ? 'Auto' : `${level}p`}</span>
                                </button>
                            )}
                            <button type="button" onClick={() => setMenu('speed')} className="flex w-full items-center justify-between gap-6 px-4 py-2 hover:bg-white/10">
                                <span>Speed</span><span className="text-white/60">{rate === 1 ? '1×' : `${rate}×`}</span>
                            </button>
                            {subtitleChoices.length > 0 && (
                                <button type="button" onClick={() => setMenu('subs')} className="flex w-full items-center justify-between gap-6 px-4 py-2 hover:bg-white/10">
                                    <span>Subtitles</span><span className="text-white/60">{sub < 0 ? 'Off' : subtitleChoices.find((s) => s.index === sub)?.label}</span>
                                </button>
                            )}
                        </>
                    )}
                    {menu === 'quality' && (
                        <>
                            <MenuItem active={level < 0} onClick={() => pickLevel(-1)}>Auto</MenuItem>
                            {levels.map((h) => <MenuItem key={h} active={level === h} onClick={() => pickLevel(h)}>{h}p</MenuItem>)}
                        </>
                    )}
                    {menu === 'speed' && SPEEDS.map((s) => <MenuItem key={s} active={rate === s} onClick={() => pickSpeed(s)}>{s === 1 ? 'Normal' : `${s}×`}</MenuItem>)}
                    {menu === 'subs' && (
                        <>
                            <MenuItem active={sub < 0} onClick={() => pickSub(-1)}>Off</MenuItem>
                            {subtitleChoices.map((s) => <MenuItem key={s.index} active={sub === s.index} onClick={() => pickSub(s.index)}>{s.label}</MenuItem>)}
                        </>
                    )}
                </div>
            )}
        </div>
    )
})

function MenuItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" onClick={onClick} className="flex w-full items-center gap-2 px-4 py-2 text-start hover:bg-white/10">
            <span className="grid h-4 w-4 place-items-center">{active && <Check aria-hidden className="h-4 w-4 text-red-400" />}</span>
            {children}
        </button>
    )
}

export default DirectPlayer
