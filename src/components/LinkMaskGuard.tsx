'use client'

// ONE-FILE LINK MASKING (href masking / soft navigation).
//
// Mounted once in src/app/layout.tsx. It finds every <a href> on the site (next/link renders one
// too), moves the destination out of the visible `href` attribute into an encoded data-gm
// attribute, and keeps the link working:
//   - normal click on a <Link>: Next.js still does its own instant navigation (no page reload)
//   - Enter, Ctrl/Cmd/Shift-click, middle click, raw <a> tags, external links: handled here
// Result: no URL in the status bar on hover, nothing to "Copy link address", nothing to drag.
//
// Not masked on purpose: in-page anchors (#main), `download` links, javascript:/blob:/data: URLs,
// anything with data-keep-href (or inside data-keep-hrefs).
// Switch off without touching code: set NEXT_PUBLIC_MASK_LINKS=0 and rebuild.
//
// Honest limit: this hides the visible link, it is not secrecy (the Network tab still shows
// where pages go), and crawlers that don't run JavaScript won't follow links without an href:
// keep your sitemap, and add data-keep-href to links you need crawled.

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const OFF = process.env.NEXT_PUBLIC_MASK_LINKS === '0'
const KEY = 'tf-link-mask'
const SKIP = '[data-keep-href], [data-gm], [download]'
// Redirect / file routes: a router push can't render them, so load them for real.
const HARD = /^\/(api|download|download2|surprise)(\/|\?|#|$)/

function encode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] ^ KEY.charCodeAt(i % KEY.length))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decode(text: string): string {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '==='.slice((base64.length + 3) % 4))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i) ^ KEY.charCodeAt(i % KEY.length)
  return new TextDecoder().decode(bytes)
}

const maskable = (href: string | null): href is string =>
  !!href && !href.startsWith('#') && !/^(blob|data|javascript):/i.test(href)

function mask(anchor: HTMLAnchorElement) {
  if (anchor.matches(SKIP) || anchor.closest('[data-keep-hrefs]')) return
  const href = anchor.getAttribute('href')
  if (!maskable(href)) return
  anchor.setAttribute('data-gm', encode(href))
  anchor.removeAttribute('href')
  if (!anchor.hasAttribute('role')) anchor.setAttribute('role', 'link')
  if (!anchor.hasAttribute('tabindex')) anchor.setAttribute('tabindex', '0')
  anchor.setAttribute('draggable', 'false')
  anchor.style.cursor = 'pointer'
}

function sweep(root: ParentNode) {
  if (root instanceof HTMLAnchorElement && root.hasAttribute('href')) mask(root)
  root.querySelectorAll?.<HTMLAnchorElement>('a[href]').forEach(mask)
}

const masked = (target: EventTarget | null) =>
  target instanceof Element ? target.closest<HTMLAnchorElement>('a[data-gm]') : null

export default function LinkMaskGuard() {
  const router = useRouter()

  useEffect(() => {
    if (OFF) return

    const follow = (anchor: HTMLAnchorElement, newTab: boolean) => {
      const href = decode(anchor.getAttribute('data-gm') ?? '')
      if (/^(mailto|tel|sms|webcal|intent|market):/i.test(href)) { window.location.href = href; return }
      if (newTab || anchor.getAttribute('target') === '_blank') { window.open(href, '_blank', 'noopener,noreferrer'); return }
      let path: string | null = href.startsWith('/') && !href.startsWith('//') && !HARD.test(href) ? href : null
      if (!path && /^(https?:)?\/\//i.test(href)) {
        try {
          const url = new URL(href, window.location.origin)
          if (url.origin === window.location.origin && !HARD.test(url.pathname)) path = url.pathname + url.search + url.hash
        } catch { /* leave it a normal load */ }
      }
      if (path) router.push(path)
      else window.location.assign(href)
    }

    const onClick = (event: MouseEvent) => {
      const anchor = masked(event.target)
      // A <Link> click Next.js already handled (soft navigation) arrives here as defaultPrevented.
      if (!anchor || event.defaultPrevented || event.button !== 0) return
      event.preventDefault()
      follow(anchor, event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    }
    const onAuxClick = (event: MouseEvent) => {
      const anchor = masked(event.target)
      if (!anchor || event.defaultPrevented || event.button !== 1) return
      event.preventDefault()
      follow(anchor, true)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const anchor = masked(event.target)
      // Without an href the browser no longer turns Enter into a click: do it here.
      if (!anchor || event.defaultPrevented || event.key !== 'Enter' || event.target !== anchor) return
      event.preventDefault()
      follow(anchor, event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    }
    const onDragStart = (event: DragEvent) => { if (masked(event.target)) event.preventDefault() }

    document.addEventListener('click', onClick)
    document.addEventListener('auxclick', onAuxClick)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('dragstart', onDragStart)

    sweep(document)
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes') {
          // React wrote an href again (the link changed): hide it again. (Our own removal of the
          // href also fires this record, hence the hasAttribute check.)
          if (record.target instanceof HTMLAnchorElement && record.target.hasAttribute('href')) {
            record.target.removeAttribute('data-gm')
            mask(record.target)
          }
        } else {
          record.addedNodes.forEach((node) => { if (node instanceof Element) sweep(node) })
        }
      }
    })
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] })

    return () => {
      observer.disconnect()
      document.removeEventListener('click', onClick)
      document.removeEventListener('auxclick', onAuxClick)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('dragstart', onDragStart)
    }
  }, [router])

  return null
}
