import { useId } from 'react'

// The drama hubs' watermarks: the window screens of the two houses the series are set in. Drawn in
// the current colour, for HubHeader's watermark slot (about 13% of the hub's accent). Decoration.

/** An Ottoman kafes: the wooden lattice screen of a pointed-arch window, as in a konak or a palace harem. */
export function KafesMark({ className }: { className?: string }) {
  const id = useId()
  const arch = 'M16 98 V46 C16 26 30 12 50 4 C70 12 84 26 84 46 V98 Z'
  const lines: string[] = []
  for (let offset = -100; offset <= 100; offset += 7) {
    lines.push(`M${offset} 0 L${offset + 100} 100`, `M${offset + 100} 0 L${offset} 100`)
  }
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className} fill="none" stroke="currentColor">
      <defs>
        <clipPath id={`kafes-${id}`}>
          <path d={arch} />
        </clipPath>
      </defs>
      <g clipPath={`url(#kafes-${id})`} strokeWidth={1.1}>
        <path d={lines.join(' ')} />
      </g>
      <path d={arch} strokeWidth={3} strokeLinejoin="round" />
      <path d="M22 98 V48 C22 31 34 19 50 11 C66 19 78 31 78 48 V98" strokeWidth={1.2} />
    </svg>
  )
}

/** A Korean changsal: the slatted paper window of a hanok, thin vertical bars held by three bands. */
export function ChangsalMark({ className }: { className?: string }) {
  const bars: string[] = []
  for (let x = 16; x <= 84; x += 5.2) bars.push(`M${x.toFixed(1)} 10 V90`)
  const bands: string[] = []
  for (const top of [16, 47, 78]) for (let y = top; y <= top + 6; y += 3) bands.push(`M10 ${y} H90`)
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className} fill="none" stroke="currentColor">
      <rect x="6" y="6" width="88" height="88" rx="2" strokeWidth={3.2} />
      <rect x="10" y="10" width="80" height="80" strokeWidth={1.2} />
      <path d={bars.join(' ')} strokeWidth={1.1} />
      <path d={bands.join(' ')} strokeWidth={1.1} />
      <path d="M50 6 V94" strokeWidth={2.2} />
    </svg>
  )
}

/** A Chinese lattice window: square frame with interlocking geometric bars. */
export function LatticeMark({ className }: { className?: string }) {
  const bars: string[] = []
  for (let i = 12; i <= 88; i += 8) {
    bars.push(`M${i} 12 V88`, `M12 ${i} H88`)
  }
  for (let o = -80; o <= 80; o += 16) {
    bars.push(`M${o} 12 L${o + 76} 88`, `M${o + 76} 12 L${o} 88`)
  }
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className} fill="none" stroke="currentColor">
      <rect x="6" y="6" width="88" height="88" rx="1.5" strokeWidth={3} />
      <rect x="10" y="10" width="80" height="80" strokeWidth={1.1} />
      <g strokeWidth={1} opacity={0.9}>
        <path d={bars.join(' ')} />
      </g>
      <path d="M50 6 V94 M6 50 H94" strokeWidth={1.8} />
    </svg>
  )
}

/**
 * A Thai temple window: the pointed-arch niche of a wat, filled with a diamond lattice, crowned by
 * a chofa — the horn-like finial on a Thai temple roof. Thailand's silhouette, not China's.
 */
export function ThaiMark({ className }: { className?: string }) {
  const id = useId()
  const arch = 'M16 98 V48 C16 26 30 12 50 6 C70 12 84 26 84 48 V98 Z'
  const diamonds: string[] = []
  for (let y = 12; y <= 94; y += 8) {
    for (let x = 12; x <= 88; x += 8) {
      diamonds.push(`M${x} ${y} l3.5 3.5 l-3.5 3.5 l-3.5 -3.5 Z`)
    }
  }
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className} fill="none" stroke="currentColor">
      <defs>
        <clipPath id={`thai-${id}`}>
          <path d={arch} />
        </clipPath>
      </defs>
      <g clipPath={`url(#thai-${id})`} strokeWidth={1}>
        <path d={diamonds.join(' ')} />
      </g>
      <path d={arch} strokeWidth={3} strokeLinejoin="round" />
      <path d="M22 98 V50 C22 32 34 20 50 13 C66 20 78 32 78 50 V98" strokeWidth={1.2} />
      {/* The chofa, the bird-like finial on a Thai temple roof. */}
      <path d="M50 6 V0 M46 2 L50 0 L54 2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function HubWatermark({ kind, className }: { kind: 'kafes' | 'changsal' | 'lattice' | 'thai', className?: string }) {
  if (kind === 'kafes') return <KafesMark className={className} />
  if (kind === 'changsal') return <ChangsalMark className={className} />
  if (kind === 'thai') return <ThaiMark className={className} />
  return <LatticeMark className={className} />
}
