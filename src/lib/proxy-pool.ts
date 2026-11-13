/**
 * Auto-updating free proxy pool
 * Source: https://sunny9577.github.io/proxy-scraper/proxies.json
 * (same list your friend uses — updates automatically, no manual change needed)
 */

const PROXY_LIST_URL =
  process.env.PROXY_LIST_URL ||
  "https://sunny9577.github.io/proxy-scraper/proxies.json";

/** How long we keep the list in memory before refreshing (ms) */
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** How many different proxies to try before falling back to direct */
const MAX_PROXY_ATTEMPTS = 3;

export type ProxyEntry = {
  ip: string;
  port: string;
  country?: string;
  anonymity?: string;
  type?: string;
};

type Cache = {
  proxies: ProxyEntry[];
  fetchedAt: number;
};

let cache: Cache | null = null;

/** Simple shuffle so we don't always hit the same proxy first */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Load / refresh the proxy list from the public JSON.
 * Returns only HTTP/HTTPS style proxies (ip + port).
 */
export async function getProxyList(): Promise<ProxyEntry[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS && cache.proxies.length > 0) {
    return cache.proxies;
  }

  try {
    const res = await fetch(PROXY_LIST_URL, {
      signal: AbortSignal.timeout(12_000),
      headers: { accept: "application/json" },
      next: { revalidate: 600 }, // hint for Next.js / Vercel cache
    } as RequestInit);

    if (!res.ok) {
      console.warn("[proxy-pool] list fetch failed:", res.status);
      return cache?.proxies ?? [];
    }

    const data = (await res.json()) as unknown;
    let list: ProxyEntry[] = [];

    if (Array.isArray(data)) {
      list = data
        .filter(
          (p): p is ProxyEntry =>
            p &&
            typeof p === "object" &&
            typeof (p as ProxyEntry).ip === "string" &&
            typeof (p as ProxyEntry).port === "string"
        )
        .filter((p) => {
          // Keep only entries that look like HTTP proxies
          const t = (p.type || "").toUpperCase();
          return !t || t.includes("HTTP");
        });
    }

    if (list.length === 0) {
      console.warn("[proxy-pool] empty list after parse");
      return cache?.proxies ?? [];
    }

    cache = { proxies: list, fetchedAt: now };
    console.log(`[proxy-pool] loaded ${list.length} proxies`);
    return list;
  } catch (err) {
    console.warn("[proxy-pool] fetch error:", err);
    return cache?.proxies ?? [];
  }
}

/**
 * Pick up to `count` random proxies for this request.
 */
export async function pickProxies(count = MAX_PROXY_ATTEMPTS): Promise<ProxyEntry[]> {
  const list = await getProxyList();
  if (list.length === 0) return [];
  return shuffle(list).slice(0, Math.min(count, list.length));
}

/**
 * Build a proxy URL string that undici / node can use.
 * Format: http://ip:port
 */
export function proxyUrl(p: ProxyEntry): string {
  return `http://${p.ip}:${p.port}`;
}

export { MAX_PROXY_ATTEMPTS };
