"use client"

import { useRouter } from "next/navigation"
import type { ReactNode, KeyboardEvent, MouseEvent, CSSProperties } from "react"

type Href = string | { pathname?: string; query?: Record<string, any>; hash?: string; search?: string }

type SoftLinkProps = {
  href: Href
  children?: ReactNode
  className?: string
  style?: CSSProperties
  prefetch?: boolean
  replace?: boolean
  scroll?: boolean
  target?: string
  rel?: string
  onClick?: (e?: any) => void
  onMouseEnter?: (e?: any) => void
  onMouseLeave?: (e?: any) => void
  "aria-label"?: string
  "aria-current"?: "page" | undefined
  "aria-hidden"?: boolean | "true" | "false"
  title?: string
  id?: string
  role?: string
  tabIndex?: number
  ariaLabel?: string
  external?: boolean
  download?: any
  passHref?: boolean
  legacyBehavior?: boolean
  shallow?: boolean
  locale?: string | false
}

function hrefToString(href: Href): string {
  if (typeof href === "string") return href
  const path = href.pathname || "/"
  let search = href.search || ""
  if (!search && href.query) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(href.query)) {
      if (v === undefined || v === null) continue
      if (Array.isArray(v)) v.forEach((x) => params.append(k, String(x)))
      else params.set(k, String(v))
    }
    const q = params.toString()
    if (q) search = `?${q}`
  }
  const hash = href.hash ? (href.hash.startsWith("#") ? href.hash : `#${href.hash}`) : ""
  return `\( {path} \){search}${hash}`
}

function isExternalUrl(url: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(url)
}

export default function SoftLink({
  href,
  children,
  className,
  style,
  replace = false,
  scroll = true,
  target,
  rel,
  onClick,
  onMouseEnter,
  onMouseLeave,
  "aria-label": ariaLabelProp,
  "aria-current": ariaCurrent,
  "aria-hidden": ariaHidden,
  title,
  id,
  role,
  tabIndex,
  ariaLabel,
  external = false,
}: SoftLinkProps) {
  const router = useRouter()
  const url = hrefToString(href)
  const ext = external || isExternalUrl(url) || target === "_blank"

  const go = (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      onClick?.(e as any)
    } catch {
      /* ignore */
    }

    if (ext) {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.openLink && /^https?:/i.test(url)) {
        tg.openLink(url)
      } else {
        window.open(url, target || "_blank", "noopener,noreferrer")
      }
      return
    }

    if (replace) router.replace(url, { scroll })
    else router.push(url, { scroll })
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      go(e)
    }
  }

  const blockMenu = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <span
      id={id}
      role={role || "link"}
      tabIndex={tabIndex ?? 0}
      className={className}
      style={{
        cursor: "pointer",
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
        ...style,
      }}
      title={title}
      aria-label={ariaLabelProp || ariaLabel}
      aria-current={ariaCurrent}
      aria-hidden={ariaHidden as any}
      onClick={go}
      onKeyDown={onKeyDown}
      onContextMenu={blockMenu}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={(e) => {
        if (e.button === 2) e.preventDefault()
      }}
    >
      {children}
    </span>
  )
}
