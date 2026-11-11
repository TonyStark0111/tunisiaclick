'use client'

import { cn } from '@/src/lib/utils'

interface CircularRatingProps {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showLabel?: boolean
}

export function CircularRating({
  rating,
  size = 'md',
  className,
  showLabel = true,
}: CircularRatingProps) {
  const percentage = (rating / 10) * 100
  const circumference = 2 * Math.PI * 18
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const getColor = () => {
    if (rating >= 7) return { stroke: '#22c55e', bg: 'rgba(34, 197, 94, 0.2)' }
    if (rating >= 5) return { stroke: '#eab308', bg: 'rgba(234, 179, 8, 0.2)' }
    return { stroke: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)' }
  }

  const colors = getColor()

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  }

  const textSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-sm',
  }

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="rgba(0,0,0,0.7)"
          stroke={colors.bg}
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke={colors.stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold text-white', textSizes[size])}>
            {rating > 0 ? rating.toFixed(1) : 'NR'}
          </span>
        </div>
      )}
    </div>
  )
}
