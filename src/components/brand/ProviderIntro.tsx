'use client'

/**
 * Exact Ayushflix-style OTT intro for XEONFLIX.
 * Sequence (same as jaatayushh.onrender.com/flix):
 *   Netflix → Prime Video → JioHotstar → ZEE5 → Sony LIV → Crunchyroll → ALL-IN-ONE
 *   → flash + N zoom → N flip out / X flip in → XEONFLIX wordmark → fade out
 * Timing: logoInterval 280ms (identical).
 * Storage: xeonflix_skip_intro
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'xeonflix_skip_intro'
const LOGO_INTERVAL = 280

type Ott =
  | { type: 'img'; src: string; alt: string }
  | { type: 'text'; text: string; style: React.CSSProperties }

const OTT_LOGOS: Ott[] = [
  { type: 'img', src: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg', alt: 'NETFLIX' },
  { type: 'img', src: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg', alt: 'PRIME VIDEO' },
  { type: 'img', src: 'https://upload.wikimedia.org/wikipedia/commons/4/40/JioHotstar_2025.png', alt: 'JioHotstar' },
  { type: 'img', src: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/ZEE5_2025.svg', alt: 'ZEE5' },
  {
    type: 'text',
    text: 'Sony LIV',
    style: {
      color: '#F39200',
      fontFamily: "'Inter', sans-serif",
      fontWeight: 800,
      letterSpacing: 'normal',
      textShadow: '0 0 30px #F3920066',
    },
  },
  { type: 'img', src: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Crunchyroll_Logo.svg', alt: 'crunchyroll' },
  {
    type: 'text',
    text: 'ALL-IN-ONE',
    style: {
      color: '#E5E5E5',
      fontFamily: "'Bebas Neue', sans-serif",
      fontWeight: 'normal',
      letterSpacing: '0.25em',
      textShadow: '0 0 40px rgba(255,255,255,0.4)',
    },
  },
]

function playIntroSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    const now = ctx.currentTime
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.72, now)
    master.connect(ctx.destination)

    const osc1 = ctx.createOscillator()
    const g1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(95, now)
    osc1.frequency.exponentialRampToValueAtTime(26, now + 0.32)
    g1.gain.setValueAtTime(1.0, now)
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc1.connect(g1)
    g1.connect(master)
    osc1.start(now)
    osc1.stop(now + 0.36)

    const osc2 = ctx.createOscillator()
    const g2 = ctx.createGain()
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(180, now + 0.12)
    osc2.frequency.exponentialRampToValueAtTime(55, now + 0.5)
    g2.gain.setValueAtTime(0.55, now + 0.12)
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.55)
    osc2.connect(g2)
    g2.connect(master)
    osc2.start(now + 0.12)
    osc2.stop(now + 0.56)
  } catch { /* autoplay / unsupported */ }
}

export default function ProviderIntro() {
  const [visible, setVisible] = useState(false)
  const [gone, setGone] = useState(true)
  const [activeOtt, setActiveOtt] = useState(-1)
  const [flashPop, setFlashPop] = useState(false)
  const [letterN, setLetterN] = useState('')
  const [letterX, setLetterX] = useState('')
  const [letterStageOn, setLetterStageOn] = useState(true)
  const [brandIn, setBrandIn] = useState(false)
  const [imgFailed, setImgFailed] = useState<Record<number, boolean>>({})
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const finished = useRef(false)

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const finishIntro = useCallback(() => {
    if (finished.current) return
    finished.current = true
    clearTimers()
    setVisible(false)
    timers.current.push(setTimeout(() => setGone(true), 1000))
  }, [clearTimers])

  const skipForever = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, 'true') } catch { /* */ }
    finishIntro()
  }, [finishIntro])

  useEffect(() => {
    // Preload OTT images
    OTT_LOGOS.forEach((item) => {
      if (item.type === 'img') {
        const img = new Image()
        img.src = item.src
      }
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') return
      if (window.location.hash || /[?&]e=/.test(window.location.search)) return
    } catch {
      return
    }

    finished.current = false
    setGone(false)
    setVisible(true)
    setActiveOtt(-1)
    setFlashPop(false)
    setLetterN('')
    setLetterX('')
    setLetterStageOn(true)
    setBrandIn(false)

    const later = (fn: () => void, ms: number) => {
      timers.current.push(setTimeout(() => { if (!cancelled) fn() }, ms))
    }

    // Step 1: OTT logos (exact Ayushflix interval)
    OTT_LOGOS.forEach((_, index) => {
      later(() => setActiveOtt(index), index * LOGO_INTERVAL)
    })
    const ottEnd = OTT_LOGOS.length * LOGO_INTERVAL

    // Step 2: clear OTT, flash, sound, zoom N
    later(() => {
      setActiveOtt(-1)
      setFlashPop(false)
      // reflow restart
      later(() => setFlashPop(true), 20)
      playIntroSound()
      setLetterN('intro-n-in')
    }, ottEnd + 120)

    // Step 3: flip out N, flip in X (Ayushflix uses A; XEONFLIX uses X)
    later(() => {
      setLetterN('intro-n-out')
      setLetterX('intro-a-in')
    }, ottEnd + 1600)

    // Step 4: flash + brand
    later(() => {
      setFlashPop(false)
      later(() => setFlashPop(true), 20)
      setLetterStageOn(false)
      setBrandIn(true)
    }, ottEnd + 2700)

    // Step 5: finish
    later(() => finishIntro(), ottEnd + 5200)

    return () => {
      cancelled = true
      clearTimers()
    }
  }, [clearTimers, finishIntro])

  if (gone) return null

  return (
    <div
      id="intro-view"
      className={visible ? '' : 'intro-hidden'}
      role="dialog"
      aria-modal="true"
      aria-label="XEONFLIX intro"
    >
      <style dangerouslySetInnerHTML={{ __html: AYUSH_INTRO_CSS }} />

      <div className="absolute top-5 right-5 z-[100] flex flex-col items-end gap-2 sm:top-8 sm:right-8">
        <button
          type="button"
          id="intro-skip-btn"
          onClick={finishIntro}
          className="flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xl backdrop-blur-md transition-all hover:scale-105 hover:border-white/40 hover:bg-black/90 active:scale-95"
        >
          <span>Skip Intro</span>
          <svg className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>
        <button
          type="button"
          id="intro-dont-show-btn"
          onClick={skipForever}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white/80 shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:border-white/30 hover:bg-black/85 hover:text-white active:scale-95"
        >
          <svg className="h-3.5 w-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
          <span>Don&apos;t show again</span>
        </button>
      </div>

      {OTT_LOGOS.map((item, index) => (
        <div
          key={index}
          id={`ott-logo-${index}`}
          className={`ott-flash-text${activeOtt === index ? ' ott-active' : ''}`}
          style={item.type === 'text' ? item.style : undefined}
        >
          {item.type === 'img' ? (
            imgFailed[index] ? (
              <span style={{ fontWeight: 800, letterSpacing: '0.08em' }}>{item.alt}</span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.src}
                alt={item.alt}
                className="ott-logo-img"
                draggable={false}
                onError={() => setImgFailed((prev) => ({ ...prev, [index]: true }))}
              />
            )
          ) : (
            item.text
          )}
        </div>
      ))}

      <div className={`intro-flash${flashPop ? ' intro-flash-pop' : ''}`} id="intro-flash" />

      {letterStageOn && (
        <div className="intro-letter-stage" style={{ opacity: letterN || letterX ? 1 : 0 }}>
          <div className={`intro-letter${letterN ? ` ${letterN}` : ''}`} id="intro-letter-n">N</div>
          <div className={`intro-letter${letterX ? ` ${letterX}` : ''}`} id="intro-letter-a">X</div>
        </div>
      )}

      <div className={`ayushflix-logo${brandIn ? ' ayushflix-in' : ''}`} id="ayushflix-logo">
        XEONFLIX
      </div>
    </div>
  )
}

/** Pixel-matched CSS from Ayushflix #intro-view (brand wordmark → XEONFLIX). */
const AYUSH_INTRO_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800;900&display=swap');

#intro-view {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: opacity 1s ease;
}
#intro-view.intro-hidden {
  opacity: 0;
  pointer-events: none;
}
.intro-letter-stage {
  position: relative;
  width: 260px;
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 900px;
  transition: opacity 0.4s ease;
}
.intro-letter {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Bebas Neue', -apple-system, sans-serif;
  font-size: 200px;
  line-height: 1;
  color: #E50914;
  text-shadow: 0 0 60px rgba(229,9,20,0.85), 0 0 15px rgba(229,9,20,0.95);
  background-image: linear-gradient(180deg, #FF3B3B 0%, #E50914 45%, #831015 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: blur(18px);
  opacity: 0;
  transform: scale(3.2);
  backface-visibility: hidden;
}
.intro-letter.intro-n-in {
  animation: introZoomIn 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.intro-letter.intro-n-out {
  animation: introFlipOut 0.9s ease-in forwards;
}
.intro-letter.intro-a-in {
  animation: introFlipIn 0.9s ease-out forwards;
}
@keyframes introZoomIn {
  0%   { opacity: 0; filter: blur(24px); transform: scale(3.4) rotate(0deg); }
  60%  { opacity: 1; filter: blur(2px);  transform: scale(1.08); }
  100% { opacity: 1; filter: blur(0px);  transform: scale(1); }
}
@keyframes introFlipOut {
  0%   { opacity: 1; filter: blur(0px); transform: scale(1) rotateY(0deg); }
  100% { opacity: 0; filter: blur(2px); transform: scale(1.05) rotateY(90deg); }
}
@keyframes introFlipIn {
  0%   { opacity: 0; filter: blur(2px); transform: scale(1.05) rotateY(-90deg); }
  100% { opacity: 1; filter: blur(0px); transform: scale(1) rotateY(0deg); }
}
.intro-flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(229,9,20,0) 60%);
  opacity: 0;
  pointer-events: none;
}
.intro-flash.intro-flash-pop {
  animation: introFlash 0.6s ease-out forwards;
}
@keyframes introFlash {
  0% { opacity: 0.75; }
  100% { opacity: 0; }
}
.ott-flash-text {
  position: absolute;
  font-size: 40px;
  text-align: center;
  opacity: 0;
  transform: scale(0.9);
  transition: opacity 0.5s ease, transform 0.6s ease;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.ott-logo-img {
  max-width: 60vw;
  max-height: 120px;
  object-fit: contain;
  filter: drop-shadow(0 0 30px rgba(255,255,255,0.2));
}
.ott-active {
  opacity: 1;
  transform: scale(1);
  z-index: 10;
}
@media (min-width: 768px) {
  .ott-flash-text { font-size: 80px; }
}
.ayushflix-logo {
  position: absolute;
  font-family: 'Bebas Neue', 'Inter', sans-serif;
  font-size: 65px;
  letter-spacing: 0.2em;
  font-weight: bold;
  background-image: linear-gradient(180deg, #ff7272 0%, #E50914 45%, #7a0005 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 30px rgba(229,9,20,0.6)) drop-shadow(0 4px 8px rgba(0,0,0,0.8));
  opacity: 0;
  transform: scale(1.5) translateZ(0);
  transition: opacity 1.2s ease, transform 1.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.ayushflix-in {
  opacity: 1;
  transform: scale(1) translateZ(0);
}
@media (min-width: 768px) {
  .ayushflix-logo { font-size: 130px; }
}
@media (prefers-reduced-motion: reduce) {
  .intro-letter.intro-n-in,
  .intro-letter.intro-n-out,
  .intro-letter.intro-a-in {
    animation: none !important;
    opacity: 1 !important;
    filter: none !important;
    transform: none !important;
  }
  .ayushflix-logo { transition: opacity 0.3s ease; }
}
`
