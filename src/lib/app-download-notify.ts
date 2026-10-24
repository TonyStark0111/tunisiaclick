/**
 * App download / install popup (`AppOffer` — Android APK, PWA, etc.).
 *
 * **Repository default: off.** The variable is optional.
 *
 * | Source                         | Behaviour                                      |
 * |--------------------------------|------------------------------------------------|
 * | Unset                          | off (hidden)                                   |
 * | `APP_DOWNLOAD_NOTIFY=off`      | off (hidden) — set in repo `.env` / `.env.example` |
 * | `APP_DOWNLOAD_NOTIFY=on`       | on  (shown) — only if you set it in hosting UI |
 *
 * Also accepts lowercase `app_download_notify`.
 * Truthy values: `on` | `true` | `1` | `yes` (case-insensitive).
 */
export function isAppDownloadNotifyEnabled(): boolean {
  const raw =
    process.env.APP_DOWNLOAD_NOTIFY ??
    process.env.app_download_notify ??
    'off'
  return /^(1|true|on|yes)$/i.test(String(raw).trim())
}
