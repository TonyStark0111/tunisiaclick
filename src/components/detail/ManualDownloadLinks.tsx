'use client'

import React from 'react'
import { Download, ExternalLink } from 'lucide-react'
import { cn } from '@/src/lib/utils'
import type { ManualDownloadEntry, ManualLinkColor } from '@/src/data/manual-downloads'

const COLOR_CLASSES: Record<ManualLinkColor, string> = {
  white: 'text-white',
  red: 'text-red-500',
  orange: 'text-orange-400',
  green: 'text-emerald-400',
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  yellow: 'text-yellow-400',
  cyan: 'text-cyan-400',
}

const BUTTON_BG: Record<ManualLinkColor, string> = {
  white: 'bg-white/10 hover:bg-white/20 ring-white/20',
  red: 'bg-red-500/15 hover:bg-red-500/25 ring-red-500/30',
  orange: 'bg-orange-500/15 hover:bg-orange-500/25 ring-orange-500/30',
  green: 'bg-emerald-500/15 hover:bg-emerald-500/25 ring-emerald-500/30',
  blue: 'bg-blue-500/15 hover:bg-blue-500/25 ring-blue-500/30',
  purple: 'bg-purple-500/15 hover:bg-purple-500/25 ring-purple-500/30',
  yellow: 'bg-yellow-500/15 hover:bg-yellow-500/25 ring-yellow-500/30',
  cyan: 'bg-cyan-500/15 hover:bg-cyan-500/25 ring-cyan-500/30',
}

type Props = {
  entry: ManualDownloadEntry
  className?: string
  /** Compact mode for dialogs / theatre overlay */
  compact?: boolean
}

/**
 * Renders manual download links in the requested hierarchy:
 *
 *   Main Title          (white, large)
 *   ┌─────────────────────────────┐
 *   │  Sub Main title 1 (red)     │  ← big colored button group
 *   │    [link] [link]            │
 *   └─────────────────────────────┘
 *   Sub main title 2 (orange)
 *   Sub main title 3 (green)
 */
export default function ManualDownloadLinks({ entry, className, compact = false }: Props) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Title – white */}
      <div className="text-center sm:text-start">
        <h2
          className={cn(
            'font-display font-bold tracking-tight text-white',
            compact ? 'text-xl' : 'text-2xl sm:text-3xl',
          )}
        >
          {entry.mainTitle}
        </h2>
        {entry.note && (
          <p className="mt-1 text-sm text-white/50">{entry.note}</p>
        )}
      </div>

      {/* Groups */}
      <div className="space-y-5">
        {entry.groups.map((group, gIdx) => (
          <div key={`${group.title}-${gIdx}`} className="space-y-3">
            {/* Sub Main title – colored */}
            <h3
              className={cn(
                'font-semibold',
                COLOR_CLASSES[group.color] ?? COLOR_CLASSES.white,
                compact ? 'text-base' : 'text-lg',
              )}
            >
              {group.title}
            </h3>

            {/* Big buttons for each link */}
            <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
              {group.links.map((link, lIdx) => (
                <a
                  key={`${link.url}-${lIdx}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'pressable group flex items-center gap-3 rounded-2xl p-3.5 ring-1 transition-all',
                    BUTTON_BG[group.color] ?? BUTTON_BG.white,
                  )}
                >
                  <span
                    className={cn(
                      'grid h-10 w-10 shrink-0 place-items-center rounded-full',
                      group.color === 'red' && 'bg-red-500/20 text-red-400',
                      group.color === 'orange' && 'bg-orange-500/20 text-orange-400',
                      group.color === 'green' && 'bg-emerald-500/20 text-emerald-400',
                      group.color === 'blue' && 'bg-blue-500/20 text-blue-400',
                      group.color === 'purple' && 'bg-purple-500/20 text-purple-400',
                      group.color === 'yellow' && 'bg-yellow-500/20 text-yellow-400',
                      group.color === 'cyan' && 'bg-cyan-500/20 text-cyan-400',
                      (group.color === 'white' || !group.color) && 'bg-white/10 text-white/80',
                    )}
                  >
                    <Download className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white group-hover:underline" dir="auto">
                      {link.label}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-white/50">
                      {link.quality && <span>{link.quality}</span>}
                      {link.size && <span>{link.size}</span>}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-white/30 group-hover:text-white/60" aria-hidden />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
