// Optional Moctale reviews summary proxy. Returns 204 when unavailable so the
// client can fall back to the deterministic local summary without error noise.
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim()
  if (!slug || !/^[a-z0-9-]{2,120}$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  }

  const cookie = process.env.MOCTALE_COOKIE || ''
  let finalCookie = cookie
  if (cookie.includes('auth_token=')) {
    const match = cookie.match(/auth_token=([^;]+)/)
    if (match) finalCookie = `auth_token=${match[1]}`
  } else if (cookie && !cookie.includes('=')) {
    finalCookie = `auth_token=${cookie}`
  }

  const url = `https://www.moctale.in/api/activity/content/${encodeURIComponent(slug)}/reviews-summary`
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.9',
        referer: `https://www.moctale.in/content/${slug}`,
        ...(finalCookie ? { cookie: finalCookie } : {}),
      },
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return new NextResponse(null, { status: 204 })
    }
    const data = await res.json()
    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': 'private, max-age=3600' } },
    )
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}
