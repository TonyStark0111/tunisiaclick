"use client"

import { useEffect } from "react"

/**
 * Initializes Telegram Mini App when the site is opened inside Telegram.
 * - Calls ready() and expand() so the WebView is not restricted
 * - Makes fullscreen / landscape requests much more reliable
 * - Safe to keep in production (does nothing outside Telegram)
 */
export default function TelegramWebAppInit() {
  useEffect(() => {
    // Only run inside Telegram WebApp
    const tg = (window as any)?.Telegram?.WebApp
    if (!tg) return

    try {
      tg.ready()
      tg.expand() // very important for video players + fullscreen

      // Optional but helpful on many devices
      tg.disableVerticalSwipes?.()

      // Optional dark theme to match the player
      // tg.setHeaderColor?.("#000000")
      // tg.setBackgroundColor?.("#000000")
    } catch (e) {
      console.warn("Telegram WebApp init failed", e)
    }
  }, [])

  return null
}
