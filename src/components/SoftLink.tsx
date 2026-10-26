"use client"

import { useRouter } from "next/navigation"
import type { ReactNode, KeyboardEvent, MouseEvent } from "react"

type SoftLinkProps = {
  href: string
  children: ReactNode
  className?: string
  ariaLabel?: string
  /** External URL — opens via Telegram.WebApp.openLink when available */
  external?: boolean
}

/**
 * Soft navigation link — no real href in the DOM.
 * Works in normal browser + Telegram Mini App.
 * Long-press / right-click will NOT show any URL.
 */
export default function SoftLink({
  href,
  children,
  className,
  ariaLabel,
  external = false,
}: SoftLinkProps) {
  const router = useRouter()

  const go = (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (external) {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.openLink) {
        tg.openLink(href)
      } else {
        window.open(href, "_blank", "noopener,noreferrer")
      }
      return
    }

    router.push(href)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      go(e)
    }
  }

  // Block right-click / long-press menu so no URL can appear
  const blockMenu = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <span
      role="link"
      tabIndex={0}
      className={className}
      aria-label={ariaLabel}
      onClick={go}
      onKeyDown={onKeyDown}
      onContextMenu={blockMenu}
      onMouseDown={(e) => {
        // Prevent browser from treating it like a draggable link
        if (e.button === 2) e.preventDefault()
      }}
      style={{
        cursor: "pointer",
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
      }}
    >
      {children}
    </span>
  )
}
