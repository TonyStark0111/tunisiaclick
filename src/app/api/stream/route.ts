import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import * as http from "node:http";
import * as https from "node:https";
import { NextRequest } from "next/server";
import { getStreamByUrl } from "@/src/lib/iptv";
import { pickProxies, type ProxyEntry } from "@/src/lib/proxy-pool";

/**
 * Same-origin stream proxy — the playback fix.
 *
 * Most catalogue streams can't play directly from this https page: ~1/5 are
 * plain http:// (mixed content, hard-blocked), most hosts send no CORS
 * headers, and some require a specific User-Agent / Referer. Routing
 * playback through this endpoint removes all three problems at once: the
 * browser only ever talks to our own origin, and the server fetches
 * upstream with the headers the stream demands.
 *
 * Upstream fetch now goes through a rotating free-proxy pool
 * (https://sunny9577.github.io/proxy-scraper/proxies.json) so the list
 * updates automatically — no manual proxy changes needed.
 * Uses only Node built-ins (no undici / extra packages).
 *
 * Abuse control (this must never become an open proxy):
 *  - Entry URLs are only served if they exist in the channel catalogue.
 *  - Sub-resources (segments, variant playlists, keys…) carry an HMAC
 *    signature that only this server issues while rewriting a catalogue
 *    playlist — an unsigned, non-catalogue URL gets a 403.
 *  - Non-http(s) targets and private/loopback/link-local hosts are
 *    rejected regardless of signatures.
 */

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const UPSTREAM_TIMEOUT_MS = 15_000;

/**
 * Per-process signing secret. Deliberately not persisted: playlists are
 * re-fetched every few seconds during playback, so a restart self-heals —
 * the player just receives freshly signed playlists on its next refresh.
 */
const SECRET = process.env.STREAM_PROXY_SECRET ?? randomBytes(32).toString("hex");

function sign(url: string, ua: string, ref: string): string {
  return createHmac("sha256", SECRET).update(`${url}|${ua}|${ref}`).digest("base64url").slice(0, 24);
}

function signatureValid(url: string, ua: string, ref: string, given: string): boolean {
  const expected = sign(url, ua, ref);
  if (expected.length !== given.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  if (host.includes(":")) {
    if (host === "::1" || host === "::") return true;
    if (/^f[cd]/.test(host) || /^fe[89ab]/.test(host)) return true;
  }
  return false;
}

function errorResponse(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

interface PlaybackHints {
  ua?: string;
  ref?: string;
}

function proxiedUri(uri: string, base: string, hints: PlaybackHints): string {
  let abs: string;
  try {
    abs = new URL(uri, base).toString();
  } catch {
    return uri;
  }
  const ua = hints.ua ?? "";
  const ref = hints.ref ?? "";
  const params = new URLSearchParams({ u: abs, s: sign(abs, ua, ref) });
  if (ua) params.set("ua", ua);
  if (ref) params.set("ref", ref);
  return `/api/stream?${params.toString()}`;
}

/**
 * Rewrite every URI in an HLS playlist back through this proxy.
 */
function rewritePlaylist(text: string, base: string, hints: PlaybackHints): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_m, uri: string) => `URI="${proxiedUri(uri, base, hints)}"`);
      }
      return proxiedUri(trimmed, base, hints);
    })
    .join("\n");
}

function isPlaylistRequest(target: URL, contentType: string): boolean {
  if (contentType.toLowerCase().includes("mpegurl")) return true;
  return /\.m3u8?$/i.test(target.pathname);
}

/**
 * Fetch via a free HTTP proxy using only Node built-ins (no undici).
 * - HTTP targets: absolute-form request through the proxy
 * - HTTPS targets: CONNECT tunnel then normal TLS request
 */
function fetchViaHttpProxy(
  targetUrl: string,
  headers: Record<string, string>,
  proxy: ProxyEntry,
  timeoutMs: number
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const target = new URL(targetUrl);
    const proxyHost = proxy.ip;
    const proxyPort = Number(proxy.port) || 80;
    const isHttps = target.protocol === "https:";

    const timer = setTimeout(() => {
      reject(new Error("proxy timeout"));
    }, timeoutMs);

    const finish = (err: Error | null, res?: Response) => {
      clearTimeout(timer);
      if (err) reject(err);
      else if (res) resolve(res);
      else reject(new Error("empty response"));
    };

    if (!isHttps) {
      // HTTP: send absolute URL to the proxy
      const req = http.request(
        {
          host: proxyHost,
          port: proxyPort,
          method: "GET",
          path: targetUrl,
          headers: {
            ...headers,
            Host: target.host,
            Connection: "close",
          },
          timeout: timeoutMs,
        },
        (proxyRes) => {
          const chunks: Buffer[] = [];
          proxyRes.on("data", (c) => chunks.push(c));
          proxyRes.on("end", () => {
            const body = Buffer.concat(chunks);
            const outHeaders = new Headers();
            for (const [k, v] of Object.entries(proxyRes.headers)) {
              if (v == null) continue;
              outHeaders.set(k, Array.isArray(v) ? v.join(", ") : String(v));
            }
            finish(
              null,
              new Response(body, {
                status: proxyRes.statusCode || 502,
                headers: outHeaders,
              })
            );
          });
          proxyRes.on("error", (e) => finish(e));
        }
      );
      req.on("error", (e) => finish(e));
      req.on("timeout", () => {
        req.destroy();
        finish(new Error("proxy timeout"));
      });
      req.end();
      return;
    }

    // HTTPS: CONNECT tunnel then request over the tunnel
    const connectReq = http.request({
      host: proxyHost,
      port: proxyPort,
      method: "CONNECT",
      path: `${target.hostname}:${target.port || 443}`,
      headers: {
        Host: `${target.hostname}:${target.port || 443}`,
        Connection: "close",
      },
      timeout: timeoutMs,
    });

    connectReq.on("connect", (proxyRes, socket) => {
      if ((proxyRes.statusCode || 0) >= 300) {
        socket.destroy();
        finish(new Error(`CONNECT failed: ${proxyRes.statusCode}`));
        return;
      }

      const tlsReq = https.request(
        {
          host: target.hostname,
          port: target.port || 443,
          path: target.pathname + target.search,
          method: "GET",
          headers: {
            ...headers,
            Host: target.host,
            Connection: "close",
          },
          socket,
          servername: target.hostname,
          timeout: timeoutMs,
        },
        (tlsRes) => {
          const chunks: Buffer[] = [];
          tlsRes.on("data", (c) => chunks.push(c));
          tlsRes.on("end", () => {
            const body = Buffer.concat(chunks);
            const outHeaders = new Headers();
            for (const [k, v] of Object.entries(tlsRes.headers)) {
              if (v == null) continue;
              outHeaders.set(k, Array.isArray(v) ? v.join(", ") : String(v));
            }
            finish(
              null,
              new Response(body, {
                status: tlsRes.statusCode || 502,
                headers: outHeaders,
              })
            );
          });
          tlsRes.on("error", (e) => finish(e));
        }
      );
      tlsReq.on("error", (e) => finish(e));
      tlsReq.on("timeout", () => {
        tlsReq.destroy();
        finish(new Error("tls timeout"));
      });
      tlsReq.end();
    });

    connectReq.on("error", (e) => finish(e));
    connectReq.on("timeout", () => {
      connectReq.destroy();
      finish(new Error("connect timeout"));
    });
    connectReq.end();
  });
}

/** Direct fetch (no external proxy) — used as final fallback */
async function fetchDirect(
  target: string,
  headers: Record<string, string>,
  signal: AbortSignal
): Promise<Response> {
  return fetch(target, { headers, redirect: "follow", signal });
}

/**
 * Try several free proxies, then fall back to a direct connection.
 */
async function fetchWithProxyPool(
  target: string,
  headers: Record<string, string>,
  signal: AbortSignal
): Promise<Response> {
  const proxies = await pickProxies(3);

  for (const p of proxies) {
    if (signal.aborted) break;
    try {
      const res = await fetchViaHttpProxy(target, headers, p, UPSTREAM_TIMEOUT_MS);
      if (res) return res;
    } catch {
      // try next proxy
    }
  }

  // Last resort: direct (no external proxy)
  return fetchDirect(target, headers, signal);
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const raw = params.get("u");
  if (!raw) return errorResponse(400, "Missing stream URL.");

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return errorResponse(400, "Invalid stream URL.");
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return errorResponse(403, "Only http(s) streams can be proxied.");
  }
  if (isPrivateHost(target.hostname)) {
    return errorResponse(403, "Private or loopback stream hosts are not allowed.");
  }

  /* ---- authorization: catalogue entry, or a server-issued signature ---- */
  let hints: PlaybackHints = {};
  const record = await getStreamByUrl(target.toString()).catch(() => undefined);
  if (record) {
    hints = { ua: record.ua, ref: record.ref };
  } else {
    const sig = params.get("s") ?? "";
    const ua = params.get("ua") ?? "";
    const ref = params.get("ref") ?? "";
    if (!sig || !signatureValid(target.toString(), ua, ref, sig)) {
      return errorResponse(403, "Stream is not part of the channel catalogue.");
    }
    hints = { ua: ua || undefined, ref: ref || undefined };
  }

  /* ---- upstream fetch (through rotating free proxies) ---- */
  const headers: Record<string, string> = {
    "user-agent": hints.ua ?? DEFAULT_UA,
    accept: "*/*",
  };
  if (hints.ref) headers.referer = hints.ref;
  const range = req.headers.get("range");
  if (range) headers.range = range;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetchWithProxyPool(target.toString(), headers, controller.signal);
  } catch {
    clearTimeout(timer);
    return errorResponse(502, "The stream host did not respond.");
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  const playlist = isPlaylistRequest(target, contentType) && upstream.ok;

  if (!playlist) {
    clearTimeout(timer);
    const out = new Headers();
    out.set("content-type", contentType || "application/octet-stream");
    out.set("access-control-allow-origin", "*");
    if (upstream.ok) {
      out.set("cache-control", "public, max-age=30");
      const contentRange = upstream.headers.get("content-range");
      if (contentRange) out.set("content-range", contentRange);
    } else {
      out.set("cache-control", "no-store");
    }
    // Body may already be fully buffered (proxy path) or a stream (direct path)
    return new Response(upstream.body, { status: upstream.status, headers: out });
  }

  /* ---- playlist: buffer, rewrite, serve ---- */
  let text: string;
  try {
    text = await upstream.text();
  } catch {
    clearTimeout(timer);
    return errorResponse(502, "The stream playlist could not be read.");
  }
  clearTimeout(timer);

  const base = upstream.url || target.toString();
  return new Response(rewritePlaylist(text, base, hints), {
    status: 200,
    headers: {
      "content-type": "application/vnd.apple.mpegurl",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}
