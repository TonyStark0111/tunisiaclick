'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { Activity, FileVideo, Magnet, Network, Play, Square, UploadCloud, Video } from 'lucide-react'

const WEBRTC_TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
]

const SCRIPT_URLS = {
  hlsP2P: 'https://cdn.jsdelivr.net/npm/p2p-media-loader-hlsjs@4/dist/p2p-media-loader-hlsjs.iife.min.js',
  shaka: 'https://cdn.jsdelivr.net/npm/shaka-player@4/dist/shaka-player.compiled.js',
  shakaP2P: 'https://cdn.jsdelivr.net/npm/p2p-media-loader-shaka@4/dist/p2p-media-loader-shaka.iife.min.js',
}

type TorrentFileInfo = { name: string; size: number; index: number }
type TorrentStats = { peers: number; progress: number; downloaded: number; downloadSpeed: number; uploadSpeed: number }
type Mode = 'torrent' | 'cdn'

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-p2p-src="${src}"]`)
    if (existing?.dataset.loaded === 'true') return resolve()
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Could not load ${src}`)), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.p2pSrc = src
    script.onload = () => { script.dataset.loaded = 'true'; resolve() }
    script.onerror = () => { script.remove(); reject(new Error('A playback module could not be loaded. Check your connection or content-security policy.')) }
    document.head.appendChild(script)
  })
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

function withWebRtcTrackers(magnet: string): string {
  const additions = WEBRTC_TRACKERS
    .filter((tracker) => !magnet.includes(encodeURIComponent(tracker)) && !magnet.includes(tracker))
    .map((tracker) => `tr=${encodeURIComponent(tracker)}`)
  return additions.length ? `${magnet}${magnet.includes('?') ? '&' : '?'}${additions.join('&')}` : magnet
}

function isVideoFile(name: string): boolean {
  return /\.(mp4|m4v|mkv|webm|mov|ogv|avi|ts|m2ts)$/i.test(name)
}

/** Browser-only P2P playback tools. Torrent playback currently buffers the selected file fully
 * before creating a Blob URL; progressive torrent HTTP streaming needs a dedicated WebTorrent SW
 * proxy and is intentionally not faked here. */
export default function BrowserP2PPanel({ initialMagnet = '' }: { initialMagnet?: string }) {
  const [mode, setMode] = useState<Mode>('torrent')
  const [magnet, setMagnet] = useState(initialMagnet)
  useEffect(() => { if (initialMagnet) { setMode('torrent'); setMagnet(initialMagnet) } }, [initialMagnet])
  const [torrentFiles, setTorrentFiles] = useState<TorrentFileInfo[]>([])
  const [selectedFile, setSelectedFile] = useState<number | null>(null)
  const [torrentStats, setTorrentStats] = useState<TorrentStats | null>(null)
  const [cdnUrl, setCdnUrl] = useState('')
  const [status, setStatus] = useState('Ready')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [p2pPeers, setP2pPeers] = useState(0)
  const [p2pDownloaded, setP2pDownloaded] = useState(0)
  const [p2pUploaded, setP2pUploaded] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const torrentClientRef = useRef<any>(null)
  const torrentRef = useRef<any>(null)
  const fileRefs = useRef<any[]>([])
  const statsTimerRef = useRef<number | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const hlsRef = useRef<any>(null)
  const shakaRef = useRef<any>(null)
  const p2pEngineRef = useRef<any>(null)

  const clearVideo = useCallback(() => {
    hlsRef.current?.destroy?.()
    hlsRef.current = null
    if (shakaRef.current?.destroy) void shakaRef.current.destroy()
    shakaRef.current = null
    p2pEngineRef.current?.destroy?.()
    p2pEngineRef.current = null
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.removeAttribute('src')
      videoRef.current.load()
    }
    setP2pPeers(0)
    setP2pDownloaded(0)
    setP2pUploaded(0)
  }, [])

  const stopTorrent = useCallback(() => {
    if (statsTimerRef.current != null) window.clearInterval(statsTimerRef.current)
    statsTimerRef.current = null
    try { torrentClientRef.current?.destroy?.() } catch { /* best-effort cleanup */ }
    torrentClientRef.current = null
    torrentRef.current = null
    fileRefs.current = []
    setTorrentFiles([])
    setSelectedFile(null)
    setTorrentStats(null)
    setBusy(false)
    clearVideo()
    setStatus('Stopped')
  }, [clearVideo])

  useEffect(() => () => {
    if (statsTimerRef.current != null) window.clearInterval(statsTimerRef.current)
    try { torrentClientRef.current?.destroy?.() } catch { /* unmount cleanup */ }
    hlsRef.current?.destroy?.()
    if (shakaRef.current?.destroy) void shakaRef.current.destroy()
    p2pEngineRef.current?.destroy?.()
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  const startTorrent = useCallback(async (input: string | File) => {
    setError('')
    clearVideo()
    stopTorrent()
    setBusy(true)
    setStatus('Connecting to WebTorrent peers…')
    try {
      const moduleUrl = 'https://esm.sh/webtorrent@3.0.21?bundle'
      // Keep this browser-only module out of Next.js server and webpack resolution.
      const webtorrentModule = await import(/* webpackIgnore: true */ moduleUrl)
      const WebTorrent = webtorrentModule.default || webtorrentModule.WebTorrent
      if (!WebTorrent || WebTorrent.WEBRTC_SUPPORT === false) {
        throw new Error('This browser does not provide the WebRTC features required for browser torrent peers.')
      }
      const client = new WebTorrent({ maxConns: 35 })
      torrentClientRef.current = client
      client.on('error', (reason: Error) => setError(reason.message || 'Torrent client error'))
      client.throttleUpload?.(256 * 1024)
      const torrentInput = typeof input === 'string'
        ? withWebRtcTrackers(input.trim())
        : new Uint8Array(await input.arrayBuffer())
      client.add(torrentInput, { announce: WEBRTC_TRACKERS, maxWebConns: 2 }, (torrent: any) => {
        torrentRef.current = torrent
        const files = torrent.files
          .map((file: any, index: number) => ({ file, index }))
          .filter(({ file }: { file: any }) => isVideoFile(file.name))
          .map(({ file, index }: { file: any; index: number }) => ({ name: file.name, size: file.length, index }))
        fileRefs.current = torrent.files
        setTorrentFiles(files)
        setStatus(files.length ? 'Torrent metadata received. Select a video file.' : 'Torrent has no supported video files.')
        setBusy(false)
        const updateStats = () => setTorrentStats({
          peers: torrent.numPeers || 0,
          progress: Math.max(0, Math.min(1, torrent.progress || 0)),
          downloaded: torrent.downloaded || 0,
          downloadSpeed: torrent.downloadSpeed || 0,
          uploadSpeed: torrent.uploadSpeed || 0,
        })
        updateStats()
        if (statsTimerRef.current != null) window.clearInterval(statsTimerRef.current)
        statsTimerRef.current = window.setInterval(updateStats, 1000)
      })
    } catch (reason) {
      setBusy(false)
      setStatus('Could not start torrent')
      setError(reason instanceof Error ? reason.message : 'Unable to start browser torrent playback.')
    }
  }, [clearVideo, stopTorrent])

  const playTorrentFile = useCallback(async (index: number) => {
    const file = fileRefs.current[index]
    if (!file) return
    setError('')
    clearVideo()
    setSelectedFile(index)
    setBusy(true)
    setStatus('Downloading selected file from WebRTC peers. Playback starts after the file is complete.')
    try {
      file.select?.()
      const video = videoRef.current
      const canStreamWebm = /\.webm$/i.test(file.name) &&
        typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported('video/webm') &&
        typeof file.stream === 'function'

      if (video && canStreamWebm) {
        try {
          const mediaSource = new MediaSource()
          const streamUrl = URL.createObjectURL(mediaSource)
          objectUrlRef.current = streamUrl
          video.src = streamUrl
          await new Promise<void>((resolve, reject) => {
            mediaSource.addEventListener('sourceopen', () => resolve(), { once: true })
            mediaSource.addEventListener('error', () => reject(new Error('MediaSource could not open.')), { once: true })
          })
          const sourceBuffer = mediaSource.addSourceBuffer('video/webm')
          const reader = file.stream().getReader()
          let started = false
          while (true) {
            const result = await reader.read()
            if (result.done) break
            const chunk = result.value instanceof Uint8Array ? result.value : new Uint8Array(result.value)
            await new Promise<void>((resolve, reject) => {
              const onUpdate = () => { cleanup(); resolve() }
              const onError = () => { cleanup(); reject(new Error('WebM media segment could not be appended.')) }
              const cleanup = () => {
                sourceBuffer.removeEventListener('updateend', onUpdate)
                sourceBuffer.removeEventListener('error', onError)
              }
              sourceBuffer.addEventListener('updateend', onUpdate, { once: true })
              sourceBuffer.addEventListener('error', onError, { once: true })
              sourceBuffer.appendBuffer(chunk)
            })
            if (!started) {
              started = true
              await video.play().catch(() => undefined)
              setStatus('Streaming WebM pieces from the browser torrent swarm.')
            }
          }
          if (mediaSource.readyState === 'open') mediaSource.endOfStream()
          setStatus('WebM torrent stream completed.')
          return
        } catch {
          // Fall back to a complete-file Blob if this browser/device cannot MSE-stream the WebM.
          if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
          objectUrlRef.current = null
          video.removeAttribute('src')
          video.load()
        }
      }

      const blob = await file.blob()
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      if (video) {
        video.src = url
        await video.play().catch(() => undefined)
      }
      setStatus('File ready. Playing after the torrent file completed downloading.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not prepare this torrent file for playback.')
      setStatus('Torrent file playback failed')
    } finally {
      setBusy(false)
    }
  }, [clearVideo])

  const startCdn = useCallback(async () => {
    const url = cdnUrl.trim()
    if (!/^https:\/\//i.test(url)) {
      setError('Enter an HTTPS HLS (.m3u8) or DASH (.mpd) manifest URL.')
      return
    }
    setError('')
    clearVideo()
    setBusy(true)
    setStatus('Starting P2P CDN playback…')
    const video = videoRef.current
    if (!video) return
    const swarmId = url.split('?')[0]
    try {
      if (/\.m3u8(?:$|\?)/i.test(url)) {
        await loadScript(SCRIPT_URLS.hlsP2P)
        const Engine = (window as any).p2pml?.hlsjs?.HlsJsP2PEngine
        if (!Engine) throw new Error('P2P HLS engine did not load.')
        if (Hls.isSupported()) {
          const HlsWithP2P = Engine.injectMixin(Hls)
          const hls = new HlsWithP2P({
            p2p: {
              core: { swarmId, highDemandTimeWindow: 15, simultaneousHttpDownloads: 2 },
              onHlsJsCreated: (instance: any) => {
                const engine = instance.p2pEngine
                engine?.addEventListener?.('onPeerConnect', () => setP2pPeers((count) => count + 1))
                engine?.addEventListener?.('onPeerClose', () => setP2pPeers((count) => Math.max(0, count - 1)))
                engine?.addEventListener?.('onChunkDownloaded', (event: any) => setP2pDownloaded((count) => count + (event?.bytes || 0)))
                engine?.addEventListener?.('onChunkUploaded', (event: any) => setP2pUploaded((count) => count + (event?.bytes || 0)))
              },
            },
          })
          hlsRef.current = hls
          hls.attachMedia(video)
          hls.loadSource(url)
          hls.on(Hls.Events.MANIFEST_PARSED, () => setStatus('HLS playing with P2P + HTTP fallback.'))
          hls.on(Hls.Events.ERROR, (_event: unknown, data: any) => {
            if (data?.fatal) setError(data.details || 'HLS playback error. The source may block cross-origin playback.')
          })
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url
          setStatus('Native HLS playback. P2P is unavailable in this browser mode.')
        } else {
          throw new Error('This browser cannot play HLS with the available playback engines.')
        }
      } else if (/\.mpd(?:$|\?)/i.test(url)) {
        await Promise.all([loadScript(SCRIPT_URLS.shaka), loadScript(SCRIPT_URLS.shakaP2P)])
        const shaka = (window as any).shaka
        const Engine = (window as any).p2pml?.shaka?.ShakaP2PEngine
        if (!shaka?.Player || !Engine) throw new Error('Shaka or its P2P adapter did not load.')
        if (!shaka.Player.isBrowserSupported()) throw new Error('This browser does not support Shaka playback.')
        Engine.registerPlugins()
        const p2pEngine = new Engine({ core: { swarmId, highDemandTimeWindow: 15, simultaneousHttpDownloads: 2 } })
        p2pEngineRef.current = p2pEngine
        p2pEngine.addEventListener?.('onPeerConnect', () => setP2pPeers((count) => count + 1))
        p2pEngine.addEventListener?.('onPeerClose', () => setP2pPeers((count) => Math.max(0, count - 1)))
        const player = new shaka.Player()
        shakaRef.current = player
        await player.attach(video)
        p2pEngine.bindShakaPlayer(player)
        await player.load(url)
        setStatus('DASH playing with P2P + HTTP fallback.')
      } else {
        throw new Error('Only HLS (.m3u8) and DASH (.mpd) manifests are supported in P2P CDN mode.')
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start P2P CDN playback.')
      setStatus('P2P CDN playback failed')
    } finally {
      setBusy(false)
    }
  }, [cdnUrl, clearVideo])

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { stopTorrent(); setMode('torrent'); setError('') }} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${mode === 'torrent' ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40' : 'bg-white/[0.06] text-white/65'}`}>
          <Magnet className="h-4 w-4" /> BitTorrent swarm
        </button>
        <button type="button" onClick={() => { stopTorrent(); setMode('cdn'); setError('') }} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${mode === 'cdn' ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-400/40' : 'bg-white/[0.06] text-white/65'}`}>
          <Network className="h-4 w-4" /> P2P CDN (HLS/DASH)
        </button>
      </div>

      {mode === 'torrent' ? (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-white/55">Magnet URI</label>
          <input value={magnet} onChange={(event) => setMagnet(event.target.value)} placeholder="magnet:?xt=urn:btih:…" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-emerald-400/60" />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy || !magnet.trim().startsWith('magnet:?')} onClick={() => startTorrent(magnet)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-40">
              <Play className="h-4 w-4" /> Add magnet
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
              <UploadCloud className="h-4 w-4" /> Upload .torrent
              <input type="file" accept=".torrent,application/x-bittorrent" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void startTorrent(file); event.currentTarget.value = '' }} />
            </label>
            {torrentClientRef.current && <button type="button" onClick={stopTorrent} className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 px-4 py-2.5 text-sm text-red-300"><Square className="h-3.5 w-3.5" /> Stop</button>}
          </div>
          {torrentFiles.length > 0 && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/25 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Video files in torrent</p>
              {torrentFiles.map((file) => (
                <button key={`${file.index}-${file.name}`} type="button" onClick={() => void playTorrentFile(file.index)} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${selectedFile === file.index ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/[0.04] text-white/80 hover:bg-white/[0.08]'}`}>
                  <span className="flex min-w-0 items-center gap-2"><FileVideo className="h-4 w-4 shrink-0" /><span className="truncate">{file.name}</span></span>
                  <span className="shrink-0 text-xs text-white/45">{formatBytes(file.size)}</span>
                </button>
              ))}
            </div>
          )}
          {torrentStats && (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/25 p-3 text-xs sm:grid-cols-4">
              <div><p className="text-white/40">Peers</p><p className="mt-1 font-semibold text-white">{torrentStats.peers}</p></div>
              <div><p className="text-white/40">Torrent progress</p><p className="mt-1 font-semibold text-white">{(torrentStats.progress * 100).toFixed(1)}%</p></div>
              <div><p className="text-white/40">Download</p><p className="mt-1 font-semibold text-white">{formatBytes(torrentStats.downloadSpeed)}/s</p></div>
              <div><p className="text-white/40">Upload</p><p className="mt-1 font-semibold text-white">{formatBytes(torrentStats.uploadSpeed)}/s</p></div>
            </div>
          )}
          <p className="text-xs leading-relaxed text-amber-200/70">Browser limitation: WebM can use progressive MediaSource playback when the browser supports it; other containers currently wait for the selected file to finish downloading. Browser WebTorrent uses WebRTC-compatible peers only; ordinary TCP/UDP BitTorrent peers cannot connect directly to a browser.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-white/55">HLS or DASH manifest URL (HTTPS)</label>
          <input value={cdnUrl} onChange={(event) => setCdnUrl(event.target.value)} placeholder="https://example.com/master.m3u8 or stream.mpd" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-blue-400/60" />
          <button type="button" disabled={busy || !cdnUrl.trim()} onClick={() => void startCdn()} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><Play className="h-4 w-4" /> Start P2P CDN</button>
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-black/25 p-3 text-xs">
            <div><p className="text-white/40">Peers</p><p className="mt-1 font-semibold text-white">{p2pPeers}</p></div>
            <div><p className="text-white/40">P2P received</p><p className="mt-1 font-semibold text-white">{formatBytes(p2pDownloaded)}</p></div>
            <div><p className="text-white/40">P2P shared</p><p className="mt-1 font-semibold text-white">{formatBytes(p2pUploaded)}</p></div>
          </div>
          <p className="text-xs leading-relaxed text-white/45">P2P CDN requires other viewers to use the same manifest identity and WebRTC-compatible peers. If peers are unavailable, HLS/DASH continues using HTTP/CDN delivery. The source server must permit browser CORS requests.</p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
        <video ref={videoRef} controls playsInline className="aspect-video w-full bg-black" />
      </div>
      <div className="flex items-center gap-2 text-xs text-white/50" aria-live="polite">
        {busy ? <Activity className="h-3.5 w-3.5 animate-pulse text-emerald-400" /> : <Video className="h-3.5 w-3.5" />}
        <span>{status}</span>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-200">{error}</p>}
    </section>
  )
}
