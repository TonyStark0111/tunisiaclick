'use client'

/**
 * XEONFLIX provider-logo intro (Ayushflix-style).
 * OTT logos flash (no external image host required) → N → X → XEONFLIX.
 * localStorage key: xeonflix_skip_intro
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/src/lib/utils'

const STORAGE_KEY = 'xeonflix_skip_intro'
const LOGO_MS = 320

type OttItem = {
  id: string
  /** CSS color for the mark */
  color: string
  /** Visible label / wordmark */
  label: string
  /** Optional letter mark shown large (Netflix-style) */
  mark?: string
  font?: string
}

/** Self-contained brands — no Wikimedia dependency (fixes red-bar / failed loads). */
const OTT: OttItem[] = [
  { id: 'netflix', color: '#E50914', label: 'NETFLIX', mark: 'N', font: 'Arial Black, Impact, sans-serif' },
  { id: 'prime', color: '#00A8E1', label: 'prime video', font: 'Arial, Helvetica, sans-serif' },
  { id: 'hotstar', color: '#1B4BC9', label: 'JioHotstar', font: 'Arial Black, sans-serif' },
  { id: 'zee5', color: '#A855F7', label: 'ZEE5', mark: 'Z5', font: 'Arial Black, sans-serif' },
  { id: 'sonyliv', color: '#F39200', label: 'Sony LIV', font: 'Inter, Arial, sans-serif' },
  { id: 'crunchy', color: '#F47521', label: 'crunchyroll', font: 'Arial, sans-serif' },
  { id: 'all', color: '#E5E5E5', label: 'ALL-IN-ONE', font: 'Bebas Neue, Arial Black, sans-serif' },
]

export default function ProviderIntro() {
  const [phase, setPhase] = useState<'boot' | 'play' | 'fade' | 'done'>('boot')
  const [ottIndex, setOttIndex] = useState(-1)
  const [flash, setFlash] = useState(false)
  const [letter, setLetter] = useState<'idle' | 'n' | 'n-out' | 'x'>('idle')
  const [brand, setBrand] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const done = useRef(false)

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    clear()
    setPhase('fade')
    timers.current.push(setTimeout(() => setPhase('done'), 500))
  }, [clear])

  const skipForever = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, 'true') } catch { /* private */ }
    finish()
  }, [finish])

  useEffect(() => {
    let cancelled = false
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') {
        setPhase('done')
        return
      }
      if (window.location.hash || /[?&]e=/.test(window.location.search)) {
        setPhase('done')
        return
      }
    } catch {
      setPhase('done')
      return
    }

    done.current = false
    setPhase('play')
    setOttIndex(-1)
    setFlash(false)
    setLetter('idle')
    setBrand(false)

    const later = (fn: () => void, ms: number) => {
      timers.current.push(setTimeout(() => { if (!cancelled) fn() }, ms))
    }

    OTT.forEach((_, i) => later(() => setOttIndex(i), i * LOGO_MS))
    const ottEnd = OTT.length * LOGO_MS

    later(() => {
      setOttIndex(-1)
      setFlash(true)
      later(() => setFlash(false), 500)
      setLetter('n')
    }, ottEnd + 100)

    later(() => {
      setLetter('n-out')
      later(() => setLetter('x'), 80)
    }, ottEnd + 1700)

    later(() => {
      setFlash(true)
      later(() => setFlash(false), 500)
      setLetter('idle')
      setBrand(true)
    }, ottEnd + 2800)

    later(() => finish(), ottEnd + 5300)

    return () => {
      cancelled = true
      clear()
    }
  }, [clear, finish])

  if (phase === 'done' || phase === 'boot') return null

  const active = ottIndex >= 0 ? OTT[ottIndex] : null

  return (
    <div
      id="xeonflix-intro"
      role="dialog"
      aria-modal="true"
      aria-label="XEONFLIX intro"
      className={cn(
        'fixed inset-0 z-[200] flex items-center justify-center bg-black transition-opacity duration-500',
        phase === 'fade' ? 'opacity-0 pointer-events-none' : 'opacity-100',
      )}
    >
      <style dangerouslySetInnerHTML={{ __html: INTRO_CSS }} />

      {/* Controls */}
      <div className="absolute end-4 top-4 z-30 flex flex-col items-end gap-2 sm:end-6 sm:top-6">
        <button
          type="button"
          onClick={finish}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xl backdrop-blur-md transition hover:scale-105 hover:border-white/40 hover:bg-black/90 active:scale-95"
        >
          Skip Intro <span aria-hidden>▶</span>
        </button>
        <button
          type="button"
          onClick={skipForever}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white/80 shadow-lg backdrop-blur-md transition hover:scale-105 hover:border-white/30 hover:bg-black/85 hover:text-white active:scale-95"
        >
          <span aria-hidden className="text-red-500">⊘</span>
          Don&apos;t show again
        </button>
      </div>

      {/* Flash */}
      <div
        aria-hidden
        className={cn('xf-intro-flash pointer-events-none absolute inset-0 bg-white', flash && 'xf-intro-flash-on')}
      />

      {/* OTT stage */}
      <div className="absolute inset-0 flex items-center justify-center">
        {OTT.map((item, i) => (
          <div
            key={item.id}
            className={cn('xf-ott absolute inset-0 flex flex-col items-center justify-center gap-3', ottIndex === i && 'xf-ott-on')}
          >
            {item.mark ? (
              <span
                className="xf-ott-mark select-none"
                style={{ color: item.color, fontFamily: item.font, textShadow: `0 0 48px ${item.color}aa, 0 0 100px ${item.color}66` }}
              >
                {item.mark}
              </span>
            ) : null}
            <span
              className="xf-ott-label select-none uppercase"
              style={{
                color: item.color,
                fontFamily: item.font,
                letterSpacing: item.id === 'all' ? '0.28em' : item.id === 'prime' ? '0.04em' : '0.12em',
                textShadow: `0 0 40px ${item.color}88`,
                fontSize: item.mark ? 'clamp(14px, 4vw, 28px)' : 'clamp(28px, 9vw, 72px)',
                fontWeight: 800,
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* N → X */}
      {(letter === 'n' || letter === 'n-out' || letter === 'x') && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          {(letter === 'n' || letter === 'n-out') && (
            <span className={cn('xf-letter select-none text-[#E50914]', letter === 'n' ? 'xf-letter-in' : 'xf-letter-out')}>
              N
            </span>
          )}
          {letter === 'x' && (
            <span className="xf-letter xf-letter-x select-none text-[#ff0f00]">X</span>
          )}
        </div>
      )}

      {/* Brand */}
      {brand && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <span className="xf-brand select-none">XEONFLIX</span>
        </div>
      )}
    </div>
  )
}

const INTRO_CSS = `
#xeonflix-intro .xf-intro-flash {
  opacity: 0;
  transition: opacity 0.25s ease;
}
#xeonflix-intro .xf-intro-flash-on {
  opacity: 0.35;
}
#xeonflix-intro .xf-ott {
  opacity: 0;
  transform: scale(0.88);
  transition: opacity 0.45s ease, transform 0.55s ease;
  pointer-events: none;
}
#xeonflix-intro .xf-ott-on {
  opacity: 1;
  transform: scale(1);
  z-index: 10;
}
#xeonflix-intro .xf-ott-mark {
  font-size: clamp(64px, 28vw, 200px);
  font-weight: 900;
  line-height: 1;
}
#xeonflix-intro .xf-letter {
  font-family: Arial Black, Impact, Haettenschweiler, sans-serif;
  font-size: clamp(96px, 42vw, 240px);
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 0 60px rgba(229, 9, 20, 0.85), 0 0 120px rgba(229, 9, 20, 0.45);
}
#xeonflix-intro .xf-letter-in {
  animation: xfIntroZoom 1.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
#xeonflix-intro .xf-letter-out {
  animation: xfIntroFlipOut 0.85s ease-in forwards;
}
#xeonflix-intro .xf-letter-x {
  animation: xfIntroFlipIn 0.85s ease-out forwards;
  text-shadow: 0 0 60px rgba(255, 15, 0, 0.8), 0 0 120px rgba(255, 15, 0, 0.4);
}
#xeonflix-intro .xf-brand {
  font-family: Bebas Neue, Arial Black, Impact, sans-serif;
  font-size: clamp(40px, 12vw, 120px);
  font-weight: 700;
  letter-spacing: 0.22em;
  background-image: linear-gradient(180deg, #ff7272 0%, #E50914 45%, #7a0005 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  filter: drop-shadow(0 0 28px rgba(229, 9, 20, 0.55)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.75));
  animation: xfIntroBrand 1.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes xfIntroZoom {
  0% { opacity: 0; transform: scale(3.2); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes xfIntroFlipOut {
  0% { opacity: 1; transform: rotateY(0deg) scale(1); }
  100% { opacity: 0; transform: rotateY(90deg) scale(0.55); }
}
@keyframes xfIntroFlipIn {
  0% { opacity: 0; transform: rotateY(-90deg) scale(0.55); }
  100% { opacity: 1; transform: rotateY(0deg) scale(1); }
}
@keyframes xfIntroBrand {
  0% { opacity: 0; transform: scale(1.45); }
  100% { opacity: 1; transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  #xeonflix-intro .xf-letter-in,
  #xeonflix-intro .xf-letter-out,
  #xeonflix-intro .xf-letter-x,
  #xeonflix-intro .xf-brand {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  #xeonflix-intro .xf-ott { transition: opacity 0.2s ease; }
}
`
