// Shared types for the Movi Player integration (safe on server and client).
// Movi plays what a plain <video> can't (MKV, HEVC, AV1, HDR, multi-audio, PGS/ASS subtitles) and
// adaptive streams (HLS / DASH / Smooth), straight from a URL, in the browser. The direct-stream
// feature hands the player one of these configs; StreamSection renders it (engine: 'movi').

export type MoviSubtitle = { src: string; label?: string; lang?: string; format?: 'vtt' | 'srt'; default?: boolean }
export type MoviAudio = { src: string; label?: string; lang?: string; type?: string; default?: boolean }
export type MoviQuality = {
  src: string
  /** Resolution height in px: builds the YouTube-style quality picker. */
  height: number
  label?: string
  fps?: number
  badge?: string
  /** bits/second: lets "Auto" pick a rung. */
  bandwidth?: number
  /** WebCodecs string or family ("av01", "avc1", "vp9"). */
  codec?: string
  type?: string
  default?: boolean
}
export type MoviChapter = { title: string; start: number; end?: number; image?: string }

export type MoviPlaylistItem = { src: string; title?: string; poster?: string; startAt?: number }
/** Any attribute <movi-player> understands, passed through as is (lowercase name -> value). */
export type MoviOptions = Record<string, string | number | boolean | undefined>

export type MoviConfig = {
  /** A file (mp4/mkv/webm/ts...) or manifest (.m3u8 / .mpd / .ism). Omit when using `qualities`. */
  src?: string
  /** Several files of one title at different resolutions (no manifest needed). */
  qualities?: MoviQuality[]
  /** Separate audio files (dubs) when the video file has a single track. */
  audio?: MoviAudio[]
  subtitles?: MoviSubtitle[]
  /** A storyboard VTT: instant seek-bar previews. */
  thumbnails?: string
  poster?: string
  chapters?: MoviChapter[]
  /** Request headers for manifests, segments and files (auth tokens, signed URLs). */
  headers?: Record<string, string>
  /** Start here (seconds), unless the viewer has a saved position. */
  startAt?: number
  /** Episodes / queue: Next + Previous in the bar, Shift+N / Shift+P, lock-screen skip buttons. */
  playlist?: MoviPlaylistItem[]
  playlistIndex?: number
  /** true = straight on, a number = seconds to wait, "loop" = wrap around. */
  autoAdvance?: boolean | number | string
  shuffle?: boolean
  /** Instant seek previews from a tile sheet (YouTube / yt-dlp shape or the sprite form). */
  storyboard?: Record<string, unknown>
  /** AES-256-GCM encrypted playback (see movi-player/encrypted-server). */
  encrypted?: { tokenUrl: string; videoUrl: string; videoId: string }
  /**
   * Every other Movi attribute, by name: vr ("180 fisheye sbs", "littleplanet"), vrpad, audioonly,
   * audiooutput, lcevc / lcevcurl, engine ("wasm shaka dashjs hlsjs native"), loop, rotate, sw, hdr,
   * fps, objectfit, posterfit, postertime, preload, crossorigin, subtitledelay / subtitlesize /
   * subtitlecolor / subtitlebg / subtitleedge, buffersize, probesize, controlslist, nohotkeys...
   * They override the defaults the site sets.
   */
  options?: MoviOptions
  /** Host controls in the player's bar / menus (addControl specs). */
  customControls?: Record<string, unknown>[]
  /** Swap any of the player's icons: name -> svg markup (setIcon). */
  icons?: Record<string, string>
  /** "widevine" | "playready" | "fairplay" with `licenseUrl` (adaptive streams). */
  drm?: string
  licenseUrl?: string
}

/** True for a manifest URL (HLS / DASH / Smooth Streaming). */
export function isManifestUrl(url: string): boolean {
  return /\.(m3u8|mpd)(\?|#|$)|\.ism(\/manifest)?(\?|#|$)/i.test(url)
}
