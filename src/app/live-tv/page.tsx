"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  Tv,
  Search,
  Play,
  RefreshCw,
  AlertTriangle,
  Wifi,
  Radio,
  Star,
  Globe,
} from "lucide-react";
import Hls from "hls.js";
import type { ChannelStream, WorldPayload, CountrySummary } from "@/src/lib/iptv";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface ChannelTile {
  channelId: string;
  name: string;
  logo: string | null;
  country: string;
  countryName: string;
  categories: string[];
  streams: ChannelStream[]; // alternate URLs
}

type ViewMode = "browse" | "favorites";

const PAGE_SIZE = 80;
const FAV_KEY = "tunisia-live-tv:favorites:v1";
const ALL = "__all__";

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function groupStreams(streams: ChannelStream[]): ChannelTile[] {
  const map = new Map<string, ChannelTile>();
  for (const s of streams) {
    const key = s.channelId || s.url;
    const existing = map.get(key);
    if (existing) {
      existing.streams.push(s);
      for (const c of s.categories) {
        if (!existing.categories.includes(c)) existing.categories.push(c);
      }
      if (!existing.logo && s.logo) existing.logo = s.logo;
    } else {
      map.set(key, {
        channelId: key,
        name: s.name,
        logo: s.logo,
        country: s.country,
        countryName: s.countryName,
        categories: [...s.categories],
        streams: [s],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

function proxyUrl(url: string, ua?: string, ref?: string) {
  const params = new URLSearchParams({ u: url });
  if (ua) params.set("ua", ua);
  if (ref) params.set("ref", ref);
  return `/api/stream?${params.toString()}`;
}

function flagEmoji(code: string): string {
  if (!code || code === "UN" || code.length !== 2) return "🌐";
  const A = 0x1f1e6;
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => A + c.charCodeAt(0) - 65)
  );
}

/* ─── HLS Player ────────────────────────────────────────────────────────── */

function HlsPlayer({
  src,
  onError,
}: {
  src: string;
  onError: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.muted = true;
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) onError();
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.muted = true;
      video.addEventListener(
        "loadedmetadata",
        () => video.play().catch(() => {}),
        { once: true }
      );
      video.addEventListener("error", onError, { once: true });
    } else {
      onError();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, onError]);

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        controls
        autoPlay
        muted={isMuted}
        playsInline
      />
      {isMuted && (
        <button
          onClick={() => {
            if (videoRef.current) {
              videoRef.current.muted = false;
              setIsMuted(false);
            }
          }}
          className="absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black/95 text-white text-xs font-semibold backdrop-blur-md shadow-lg border border-white/15 transition-all"
        >
          🔊 Click to Unmute
        </button>
      )}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */

export default function LiveTvPage() {
  const [payload, setPayload] = useState<WorldPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [country, setCountry] = useState<string>(ALL);
  const [view, setView] = useState<ViewMode>("browse");
  const [selected, setSelected] = useState<ChannelTile | null>(null);
  const [streamIndex, setStreamIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [favorites, setFavorites] = useState<string[]>([]); // channelIds

  // Load catalogue
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/channels");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: WorldPayload = await res.json();
        if (!cancelled) {
          setPayload(data);
          const tiles = groupStreams(data.streams);
          if (tiles.length > 0) setSelected(tiles[0]);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load channels"
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Favorites from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const saveFavorites = useCallback((ids: string[]) => {
    setFavorites(ids);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleFavorite = useCallback(
    (id: string) => {
      saveFavorites(
        favorites.includes(id)
          ? favorites.filter((x) => x !== id)
          : [...favorites, id]
      );
    },
    [favorites, saveFavorites]
  );

  // All tiles
  const allTiles = useMemo(
    () => (payload ? groupStreams(payload.streams) : []),
    [payload]
  );

  // Category counts (from full dataset)
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set("All", allTiles.length);
    for (const t of allTiles) {
      for (const c of t.categories) {
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
    }
    return counts;
  }, [allTiles]);

  const categoryList = useMemo(() => {
    const cats = Array.from(categoryCounts.keys())
      .filter((c) => c !== "All")
      .sort((a, b) => a.localeCompare(b));
    return ["All", ...cats];
  }, [categoryCounts]);

  // Filtered tiles
  const filteredTiles = useMemo(() => {
    if (view === "favorites") {
      const set = new Set(favorites);
      return allTiles.filter((t) => set.has(t.channelId));
    }

    let list = allTiles;

    if (country !== ALL) {
      list = list.filter((t) => t.country === country);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.countryName.toLowerCase().includes(q) ||
          t.categories.some((c) => c.toLowerCase().includes(q))
      );
    } else if (category !== "All") {
      list = list.filter((t) => t.categories.includes(category));
    }

    return list;
  }, [allTiles, view, favorites, country, searchQuery, category]);

  // Reset paging when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, category, country, view]);

  const visibleTiles = filteredTiles.slice(0, visibleCount);

  // Current stream URL
  const currentStream = selected?.streams[streamIndex] ?? selected?.streams[0];
  const playSrc = currentStream
    ? proxyUrl(currentStream.url, currentStream.ua, currentStream.ref)
    : null;

  const handleStreamError = useCallback(() => {
    if (!selected) return;
    // Try next alternate stream
    if (streamIndex + 1 < selected.streams.length) {
      setStreamIndex((i) => i + 1);
    }
  }, [selected, streamIndex]);

  const selectChannel = useCallback((tile: ChannelTile) => {
    setSelected(tile);
    setStreamIndex(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const totals = payload?.totals;
  const countries = payload?.countries ?? [];

  /* ── Loading / error states ── */
  if (loadError) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500" />
        <p className="text-lg font-semibold">Could not load live channels</p>
        <p className="text-sm text-white/50">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 text-red-500 animate-spin" />
        <p className="text-sm text-white/50">Loading worldwide channels…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-10">
      <div className="mx-auto max-w-5xl px-4 pt-6 md:px-6">
        {/* ── Header ── */}
        <div className="mb-5">
          <div className="flex items-center gap-2.5 mb-1">
            <Tv className="h-7 w-7 text-red-500" strokeWidth={2.2} />
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Live TV
            </h1>
          </div>
          <p className="text-sm text-white/45 leading-relaxed">
            {totals
              ? `${totals.channels.toLocaleString()} channels · ${totals.streams.toLocaleString()} streams · ${totals.countries} countries`
              : "Worldwide live TV — free in your browser"}
          </p>
        </div>

        {/* ── Search ── */}
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            type="search"
            placeholder="Search channels, countries, categories…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setView("browse");
            }}
            className="w-full rounded-2xl border border-white/10 bg-[#12121a] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/30 transition"
          />
        </div>

        {/* ── View tabs: Browse / Favorites ── */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setView("browse")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${
              view === "browse"
                ? "bg-red-600 text-white border-red-500"
                : "bg-[#12121a] text-white/60 border-white/10 hover:text-white"
            }`}
          >
            Browse
          </button>
          <button
            onClick={() => setView("favorites")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold border transition ${
              view === "favorites"
                ? "bg-red-600 text-white border-red-500"
                : "bg-[#12121a] text-white/60 border-white/10 hover:text-white"
            }`}
          >
            <Star className="h-3 w-3" />
            Favorites
            {favorites.length > 0 && (
              <span className="ml-0.5 rounded-full bg-white/20 px-1.5 text-[10px]">
                {favorites.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Country picker (compact) ── */}
        {view === "browse" && (
          <div className="mb-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                onClick={() => setCountry(ALL)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
                  country === ALL
                    ? "bg-white/15 text-white border-white/25"
                    : "bg-[#12121a] text-white/55 border-white/10 hover:text-white"
                }`}
              >
                <Globe className="h-3 w-3" />
                All countries
              </button>
              {countries
                .slice()
                .sort((a, b) => b.count - a.count)
                .slice(0, 40)
                .map((c: CountrySummary) => (
                  <button
                    key={c.code}
                    onClick={() => setCountry(c.code)}
                    className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
                      country === c.code
                        ? "bg-white/15 text-white border-white/25"
                        : "bg-[#12121a] text-white/55 border-white/10 hover:text-white"
                    }`}
                  >
                    <span>{c.flag || flagEmoji(c.code)}</span>
                    {c.name}
                    <span className="text-[10px] opacity-60">{c.count}</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* ── Category chips ── */}
        {view === "browse" && !searchQuery.trim() && (
          <div className="flex flex-wrap gap-2 mb-5">
            {categoryList.slice(0, 24).map((cat) => {
              const active = category === cat;
              const count = categoryCounts.get(cat) ?? 0;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold border transition-all ${
                    active
                      ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-900/30"
                      : "bg-[#12121a] text-white/65 border-white/10 hover:bg-white/8 hover:text-white hover:border-white/20"
                  }`}
                >
                  {cat}
                  <span
                    className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${
                      active
                        ? "bg-white/25 text-white"
                        : "bg-white/10 text-white/45"
                    }`}
                  >
                    {count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Player card ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0e0e14] overflow-hidden shadow-2xl mb-5">
          <div className="relative aspect-video w-full bg-black">
            {playSrc && selected ? (
              <HlsPlayer
                key={`${selected.channelId}-${streamIndex}-${playSrc}`}
                src={playSrc}
                onError={handleStreamError}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-white/40 p-6 text-center">
                <Tv className="w-10 h-10 text-white/25" />
                <p className="text-sm font-semibold text-white/60">
                  Select a channel to start watching
                </p>
              </div>
            )}
          </div>

          {selected && (
            <div className="px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-lg leading-none">
                      {flagEmoji(selected.country)}
                    </span>
                    <h2 className="text-lg font-bold text-white leading-tight truncate">
                      {selected.name}
                    </h2>
                  </div>
                  <p className="text-xs text-white/40 font-medium">
                    {selected.countryName}
                    {selected.country !== "UN" ? ` · ${selected.country}` : ""}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                      LIVE NOW
                    </span>
                    {selected.categories.slice(0, 3).map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 text-[11px] text-white/50 capitalize"
                      >
                        <Wifi className="h-3 w-3 text-white/35" />
                        {c}
                      </span>
                    ))}
                    {selected.streams.length > 1 && (
                      <>
                        <span className="text-white/20 text-xs">·</span>
                        <span className="rounded-md bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-white/55">
                          Stream {streamIndex + 1}/{selected.streams.length}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => toggleFavorite(selected.channelId)}
                  className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-full border transition ${
                    favorites.includes(selected.channelId)
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                      : "bg-white/5 border-white/10 text-white/40 hover:text-amber-400"
                  }`}
                  title="Favorite"
                >
                  <Star
                    className={`h-4 w-4 ${
                      favorites.includes(selected.channelId) ? "fill-current" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Alternate streams */}
              {selected.streams.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selected.streams.map((s, i) => (
                    <button
                      key={`${s.url}-${i}`}
                      onClick={() => setStreamIndex(i)}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold border transition ${
                        i === streamIndex
                          ? "bg-red-600/20 border-red-500/40 text-red-300"
                          : "bg-white/5 border-white/10 text-white/45 hover:text-white"
                      }`}
                    >
                      Source {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Channels list ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0e0e14] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-red-400" />
              <h3 className="text-sm font-bold text-white/90">
                {view === "favorites" ? "Favorites" : "Channels"}
              </h3>
              <span className="text-xs text-white/40">
                ({filteredTiles.length.toLocaleString()})
              </span>
            </div>
          </div>

          {visibleTiles.length > 0 ? (
            <>
              <div className="divide-y divide-white/5 max-h-[min(65vh,640px)] overflow-y-auto">
                {visibleTiles.map((ch) => {
                  const isActive = selected?.channelId === ch.channelId;
                  const isFav = favorites.includes(ch.channelId);
                  return (
                    <button
                      key={ch.channelId}
                      onClick={() => selectChannel(ch)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isActive ? "bg-red-600/12" : "hover:bg-white/5"
                      }`}
                    >
                      {ch.logo ? (
                        <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-white/5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ch.logo}
                            alt=""
                            className="h-full w-full object-contain p-0.5"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                          <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse ring-1 ring-black/40" />
                        </div>
                      ) : (
                        <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-white/5 text-base">
                          {flagEmoji(ch.country)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-semibold ${
                            isActive ? "text-white" : "text-white/85"
                          }`}
                        >
                          {ch.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-tight text-red-400">
                            ● LIVE
                          </span>
                          <span className="text-[10px] text-white/40">
                            {flagEmoji(ch.country)} {ch.countryName}
                          </span>
                          {ch.categories[0] && (
                            <span className="text-[10px] text-white/35">
                              · {ch.categories[0]}
                            </span>
                          )}
                          {ch.streams.length > 1 && (
                            <span className="text-[10px] text-emerald-400/80">
                              · {ch.streams.length} sources
                            </span>
                          )}
                        </div>
                      </div>

                      {isFav && (
                        <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                      )}
                      {isActive && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600/20">
                          <Play className="h-3.5 w-3.5 fill-red-400 text-red-400" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {visibleCount < filteredTiles.length && (
                <div className="border-t border-white/8 p-3 text-center">
                  <button
                    onClick={() =>
                      setVisibleCount((c) =>
                        Math.min(c + PAGE_SIZE, filteredTiles.length)
                      )
                    }
                    className="rounded-xl bg-white/8 hover:bg-white/12 px-5 py-2 text-xs font-semibold text-white/80 transition"
                  >
                    Load more (
                    {(filteredTiles.length - visibleCount).toLocaleString()}{" "}
                    remaining)
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-14 text-center text-white/35">
              <Tv className="h-9 w-9 text-white/20" />
              <p className="text-xs">
                {view === "favorites"
                  ? "No favorites yet — star a channel while watching."
                  : "No channels match your search."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
