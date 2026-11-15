"use client"
// A test bench for Movi Player: paste any video / manifest URL and watch it with every feature on.
// This is also the reference for how the direct-stream feature should hand a source to the player.
import { useState } from 'react'
import MoviPlayerFrame from '@/src/components/player/MoviPlayerFrame'
import type { MoviConfig } from '@/src/lib/movi'

const SAMPLES: { label: string; url: string }[] = [
  { label: 'HLS (Big Buck Bunny)', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { label: 'MP4 (Big Buck Bunny)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
]

export default function PlayerLab() {
  const [input, setInput] = useState('')
  const [subs, setSubs] = useState('')
  const [audio, setAudio] = useState('')
  const [playlist, setPlaylist] = useState('')
  const [options, setOptions] = useState('{"vr":"","loop":false}')
  const [error, setError] = useState('')
  const [config, setConfig] = useState<MoviConfig | null>(null)

  const play = (src: string) => {
    const url = src.trim()
    if (!/^https?:\/\//i.test(url)) return
    let extra: MoviConfig['options']
    try { extra = options.trim() ? JSON.parse(options) : undefined; setError('') } catch { setError('Options: invalid JSON'); return }
    const queue = playlist.split('\n').map((line) => line.trim()).filter(Boolean).map((src) => ({ src }))
    // Empty values are dropped so e.g. "vr":"" doesn't switch anything on.
    const cleaned = extra && Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== '' && v !== false))
    setConfig({
      src: queue.length ? undefined : url,
      playlist: queue.length ? queue : undefined,
      autoAdvance: queue.length ? true : undefined,
      audio: audio.trim() ? [{ src: audio.trim(), label: 'Audio 2', lang: 'en' }] : undefined,
      subtitles: subs.trim() ? [{ src: subs.trim(), label: 'Subtitles', lang: 'en', default: true }] : undefined,
      options: cleaned,
    })
  }

  return (
    <main className="page-x mx-auto w-full max-w-5xl py-6">
      <h1 className="font-display text-2xl font-bold">Player lab</h1>
      <p className="mt-1 text-sm text-white/60">Movi Player: MKV, HEVC, AV1, HDR, HLS, DASH, multi-audio and subtitles, in the browser.</p>

      <div className="mt-4 grid gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="https://.../video.mkv  or  .m3u8  or  .mpd"
          className="h-10 rounded-lg bg-white/[0.06] px-3 text-sm outline-none ring-1 ring-white/10 focus:ring-red-500" />
        <input value={subs} onChange={(e) => setSubs(e.target.value)} placeholder="Optional subtitle URL (.vtt / .srt)"
          className="h-10 rounded-lg bg-white/[0.06] px-3 text-sm outline-none ring-1 ring-white/10 focus:ring-red-500" />
        <input value={audio} onChange={(e) => setAudio(e.target.value)} placeholder="Optional separate audio file (.m4a)"
          className="h-10 rounded-lg bg-white/[0.06] px-3 text-sm outline-none ring-1 ring-white/10 focus:ring-red-500" />
        <textarea value={playlist} onChange={(e) => setPlaylist(e.target.value)} rows={2} placeholder="Optional playlist: one URL per line (Next / Previous appear)"
          className="rounded-lg bg-white/[0.06] px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-red-500" />
        <textarea value={options} onChange={(e) => setOptions(e.target.value)} rows={2} spellCheck={false}
          placeholder='Any Movi attribute as JSON, e.g. {"vr":"180 sbs","engine":"wasm","loop":true,"rotate":90}'
          className="rounded-lg bg-white/[0.06] px-3 py-2 font-mono text-xs outline-none ring-1 ring-white/10 focus:ring-red-500" />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => play(input)} className="h-9 rounded-full bg-red-600 px-4 text-sm font-semibold text-white">Play</button>
          {SAMPLES.map((s) => (
            <button key={s.url} type="button" onClick={() => { setInput(s.url); play(s.url) }} className="h-9 rounded-full bg-white/[0.08] px-4 text-sm">{s.label}</button>
          ))}
        </div>
      </div>

      <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-[14px] bg-black ring-1 ring-white/10">
        {config && <MoviPlayerFrame key={config.src ?? config.playlist?.[0]?.src} config={config} title="Player lab" resumeKey={`lab:${config.src ?? config.playlist?.[0]?.src}`} />}
      </div>
      <p className="mt-3 text-xs text-white/40">The server hosting the file needs CORS and Range support. Press ? in the player for the keyboard shortcuts.</p>
    </main>
  )
}
