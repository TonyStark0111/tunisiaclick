'use client'

/**
 * XEONFLIX provider-logo intro (Ayushflix / Netflix-style).
 * Sequence: Netflix → Amazon Prime → JioHotstar → Zee5 → Sony LIV → Crunchyroll → ALL-IN-ONE
 * then brand letter flash → "XEONFLIX" wordmark → fade out.
 * Skip Intro / Don't show again (localStorage: xeonflix_skip_intro).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/src/lib/utils'

const STORAGE_KEY = 'xeonflix_skip_intro'
const LOGO_INTERVAL_MS = 280

type OttItem =
  | { kind: 'img'; src: string; alt: string }
  | { kind: 'text'; label: string; className?: string }

/** OTT brands shown one-by-one (same set / order as the reference intro). */
const OTT_LOGOS: OttItem[] = [
  { kind: 'img', src: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg', alt: 'Netflix' },
  { kind: 'img', src: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg', alt: 'Prime Video' },
  { kind: 'img', src: 'https://upload.wikimedia.org/wikipedia/commons/4/40/JioHotstar_2025.png', alt: 'JioHotstar' },
  { kind: 'img', src: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/ZEE5_2025.svg', alt: 'ZEE5' },
  { kind: 'text', label: 'Sony LIV', className: 'text-[#F39200] font-extrabold tracking-normal drop-shadow-[0_0_30px_#F3920066]' },
  { kind: 'img', src: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Crunchyroll_Logo.svg', alt: 'Crunchyroll' },
  { kind: 'text', label: 'ALL-IN-ONE', className: "text-[#E5E5E5] font-['Bebas_Neue',sans-serif] tracking-[0.25em] drop-shadow-[0_0_40px_rgba(255,255,255,0.4)]" },
]

export default function ProviderIntro() {
  const [visible, setVisible] = useState(false)
  const [gone, setGone] = useState(true)
  const [activeOtt, setActiveOtt] = useState(-1)
  const [flash, setFlash] = useState(false)
  const [letter, setLetter] = useState<'none' | 'n-in' | 'n-out' | 'a-in'>('none')
  const [showBrand, setShowBrand] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const finished = useRef(false)

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    clearTimers()
    setVisible(false)
    setTimeout(() => setGone(true), 550)
  }, [clearTimers])

  const skipForever = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch { /* private mode */ }
    finish()
  }, [finish])

  useEffect(() => {
    let cancelled = false
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') return
      // Deep links / hash: skip intro
      if (typeof window !== 'undefined' && (window.location.hash || window.location.search.includes('e='))) return
    } catch {
      return
    }

    finished.current = false
    setGone(false)
    setVisible(true)
    setActiveOtt(-1)
    setFlash(false)
    setLetter('none')
    setShowBrand(false)

    const push = (fn: () => void, ms: number) => {
      timers.current.push(setTimeout(() => { if (!cancelled) fn() }, ms))
    }

    // Step 1: OTT logos
    OTT_LOGOS.forEach((_, index) => {
      push(() => setActiveOtt(index), index * LOGO_INTERVAL_MS)
    })
    const ottEnd = OTT_LOGOS.length * LOGO_INTERVAL_MS

    // Step 2: flash + "N" (Netflix-style ta-dum moment)
    push(() => {
      setActiveOtt(-1)
      setFlash(true)
      setTimeout(() => setFlash(false), 600)
      setLetter('n-in')
    }, ottEnd + 120)

    // Step 3: N out → A in
    push(() => {
      setLetter('n-out')
      setTimeout(() => setLetter('a-in'), 50)
    }, ottEnd + 1600)

    // Step 4: brand reveal XEONFLIX
    push(() => {
      setFlash(true)
      setTimeout(() => setFlash(false), 600)
      setLetter('none')
      setShowBrand(true)
    }, ottEnd + 2700)

    // Step 5: exit
    push(() => finish(), ottEnd + 5200)

    return () => {
      cancelled = true
      clearTimers()
    }
  }, [clearTimers, finish])

  if (gone) return null

  return (
    <div
      id="xeonflix-intro"
      role="dialog"
      aria-modal="true"
      aria-label="XEONFLIX intro"
      className={cn(
        'fixed inset-0 z-[200] flex items-center justify-center bg-black transition-opacity duration-500',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
    >
      {/* Controls */}
      <div className="absolute end-4 top-4 z-20 flex flex-col items-end gap-2 sm:end-6 sm:top-6">
        <button
          type="button"
          onClick={finish}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xl backdrop-blur-md transition hover:scale-105 hover:border-white/40 hover:bg-black/90 active:scale-95"
        >
          <span>Skip Intro</span>
          <span aria-hidden className="text-sm">▶</span>
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

      {/* White flash */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-white transition-opacity duration-300',
          flash ? 'opacity-40' : 'opacity-0',
        )}
        aria-hidden
      />

      {/* OTT logos */}
      <div className="absolute inset-0 flex items-center justify-center">
        {OTT_LOGOS.map((item, index) => (
          <div
            key={index}
            className={cn(
              'absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out',
              activeOtt === index ? 'z-10 scale-100 opacity-100' : 'scale-90 opacity-0',
            )}
          >
            {item.kind === 'img' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.src}
                alt={item.alt}
                className="max-h-[120px] max-w-[60vw] object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                draggable={false}
              />
            ) : (
              <span className={cn('text-center text-[40px] uppercase md:text-[80px]', item.className)}>
                {item.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Letter stage N → A */}
      {(letter === 'n-in' || letter === 'n-out' || letter === 'a-in') && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          {(letter === 'n-in' || letter === 'n-out') && (
            <span
              className={cn(
                'font-black text-[min(40vw,220px)] leading-none text-[#E50914]',
                letter === 'n-in' && 'animate-[introZoomIn_1.6s_cubic-bezier(0.16,1,0.3,1)_forwards]',
                letter === 'n-out' && 'animate-[introFlipOut_0.9s_ease-in_forwards]',
              )}
              style={{ textShadow: '0 0 60px rgba(229,9,20,0.8)' }}
            >
              N
            </span>
          )}
          {letter === 'a-in' && (
            <span
              className="animate-[introFlipIn_0.9s_ease-out_forwards] font-black text-[min(40vw,220px)] leading-none text-[#ff0f00]"
              style={{ textShadow: '0 0 60px rgba(255,15,0,0.7)' }}
            >
              X
            </span>
          )}
        </div>
      )}

      {/* Brand wordmark */}
      {showBrand && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center animate-[introBrandIn_1.8s_cubic-bezier(0.16,1,0.3,1)_forwards]"
        >
          <span
            className="bg-gradient-to-b from-[#ff7272] via-[#E50914] to-[#7a0005] bg-clip-text font-['Bebas_Neue','Inter',sans-serif] text-[clamp(42px,12vw,130px)] font-bold tracking-[0.2em] text-transparent"
            style={{ filter: 'drop-shadow(0 0 30px rgba(229,9,20,0.6)) drop-shadow(0 4px 8px rgba(0,0,0,0.8))' }}
          >
            XEONFLIX
          </span>
        </div>
      )}

      <style jsx global>{`
        @keyframes introZoomIn {
          0% { opacity: 0; transform: scale(3); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes introFlipOut {
          0% { opacity: 1; transform: rotateY(0deg) scale(1); }
          100% { opacity: 0; transform: rotateY(90deg) scale(0.6); }
        }
        @keyframes introFlipIn {
          0% { opacity: 0; transform: rotateY(-90deg) scale(0.6); }
          100% { opacity: 1; transform: rotateY(0deg) scale(1); }
        }
        @keyframes introBrandIn {
          0% { opacity: 0; transform: scale(1.5); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
