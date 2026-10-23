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
  X,
  Maximize,
  Volume2,
  VolumeX,
  Pause,
} from "lucide-react";
import type { ChannelStream, WorldPayload, CountrySummary } from "@/src/lib/iptv";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface ChannelTile {
  channelId: string;
  name: string;
  logo: string | null;
  country: string;
  countryName: string;
  categories: string[];
  streams: ChannelStream[];
}

type ViewMode = "browse" | "favorites";

const PAGE_SIZE = 80;
const FAV_KEY = "tunisia-live-tv:favorites:v1";
const ALL = "__all__";
const LOAD_TIMEOUT_MS = 25_000;

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

function isHttp(url: string) {
  return url.startsWith("http://");
}

function proxyUrl(url: string, ua?: string, ref?: string) {
  const params = new URLSearchParams({ u: url });
  if (ua) params.set("ua", ua);
  if (ref) params.set("ref", ref);
  return `/api/stream?${params.toString()}`;
}

function flagEmoji(code: string): string {
  try {
    if (!code || code === "UN" || code.length !== 2) return "🌐";
    const upper = code.toUpperCase();
    if (!/^[A-Z]{2}$/.test(upper)) return "🌐";
    const A = 0x1f1e6;
    return String.fromCodePoint(
      A + upper.charCodeAt(0) - 65,
      A + upper.charCodeAt(1) - 65
    );
  } catch {
    return "🌐";
  }
}

/* ─── Fab-style full player (proxy + multi-source fallback) ─────────────── */

function FabPlayer({
  channel,
  onClose,
}: {
  channel: ChannelTile;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const [streamIndex, setStreamIndex] = useState(0);
  const [viaProxy, setViaProxy] = useState(() =>
    isHttp(channel.streams[0]?.url ?? "")
  );
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "playing" | "error">(
    "loading"
  );
  const [note, setNote] = useState<string | null>(null);
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stream = channel.streams[streamIndex] ?? channel.streams[0];
  const rawUrl = stream?.url ?? "";
  const playUrl = viaProxy
    ? proxyUrl(rawUrl, stream?.ua, stream?.ref)
    : rawUrl;

  const failOver = useCallback(() => {
    // 1) try proxy if not yet
    if (!viaProxy && rawUrl) {
      setViaProxy(true);
      setAttempt((a) => a + 1);
      setStatus("loading");
      setNote("Trying secure proxy…");
      return;
    }
    // 2) next stream source
    if (streamIndex + 1 < channel.streams.length) {
      const next = streamIndex + 1;
      setStreamIndex(next);
      setViaProxy(isHttp(channel.streams[next]?.url ?? ""));
      setAttempt((a) => a + 1);
      setStatus("loading");
      setNote(`Trying source ${next + 1}…`);
      return;
    }
    setStatus("error");
    setNote("This channel is currently unavailable.");
  }, [viaProxy, rawUrl, streamIndex, channel.streams]);

  // Load stream with hls.js (dynamic import so page never crashes if missing)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !rawUrl) return;

    let cancelled = false;
    setStatus("loading");

    const timeout = setTimeout(() => {
      if (!cancelled && status === "loading") failOver();
    }, LOAD_TIMEOUT_MS);

    const cleanupHls = () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {
          /* ignore */
        }
        hlsRef.current = null;
      }
    };

    cleanupHls();
    video.removeAttribute("src");
    video.load();

    (async () => {
      try {
        const HlsMod = await import("hls.js");
        const Hls = HlsMod.default;
        if (cancelled) return;

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 30,
          });
          hlsRef.current = hls;
          hls.loadSource(playUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (cancelled) return;
            setStatus("playing");
            setNote(null);
            video.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_e, data) => {
            if (data?.fatal && !cancelled) failOver();
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = playUrl;
          video.addEventListener(
            "loadedmetadata",
            () => {
              if (cancelled) return;
              setStatus("playing");
              setNote(null);
              video.play().catch(() => {});
            },
            { once: true }
          );
          video.addEventListener(
            "error",
            () => {
              if (!cancelled) failOver();
            },
            { once: true }
          );
        } else {
          // last resort: direct
          video.src = playUrl;
          video.addEventListener(
            "error",
            () => {
              if (!cancelled) failOver();
            },
            { once: true }
          );
          video.addEventListener(
            "playing",
            () => {
              if (!cancelled) {
                setStatus("playing");
                setNote(null);
              }
            },
            { once: true }
          );
        }
      } catch {
        // hls.js not available — try native
        if (cancelled) return;
        video.src = playUrl;
        video.addEventListener(
          "error",
          () => {
            if (!cancelled) failOver();
          },
          { once: true }
        );
        video.play().catch(() => {
          if (!cancelled) failOver();
        });
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      cleanupHls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playUrl, rawUrl, viaProxy, streamIndex, attempt]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === "m") toggleMute();
      if (e.key === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const pokeControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 2500);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = videoRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPaused(false);
    const onPause = () => setPaused(true);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [playUrl]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black"
      onMouseMove={pokeControls}
      onClick={pokeControls}
      role="dialog"
      aria-modal
      aria-label={`Now playing ${channel.name}`}
    >
      {/* Top bar */}
      <div
        className={`absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-gradient-to-b from-black/90 to-transparent px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-8 transition-opacity ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur hover:bg-white/20"
          aria-label="Close player"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{channel.name}</p>
          <p className="truncate text-xs text-white/50">
            {flagEmoji(channel.country)} {channel.countryName}
            {channel.categories[0] ? ` · ${channel.categories[0]}` : ""}
            {channel.streams.length > 1
              ? ` · Source ${streamIndex + 1}/${channel.streams.length}`
              : ""}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </span>
      </div>

      {/* Video */}
      <div className="relative flex-1 bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-contain"
          playsInline
          autoPlay
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
        />

        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50">
            <RefreshCw className="h-8 w-8 text-red-500 animate-spin" />
            <p className="text-sm text-white/70">{note || "Loading stream…"}</p>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-yellow-500" />
            <p className="text-sm font-semibold text-white">
              {note || "Playback failed"}
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              <button
                onClick={() => {
                  setStreamIndex(0);
                  setViaProxy(isHttp(channel.streams[0]?.url ?? ""));
                  setAttempt((a) => a + 1);
                  setStatus("loading");
                  setNote(null);
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Retry
              </button>
              <button
                onClick={onClose}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 transition-opacity ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={togglePlay}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            aria-label={paused ? "Play" : "Pause"}
          >
            {paused ? (
              <Play className="h-5 w-5 fill-white ml-0.5" />
            ) : (
              <Pause className="h-5 w-5 fill-white" />
            )}
          </button>
          <button
            onClick={toggleMute}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={toggleFullscreen}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Fullscreen"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>

        {channel.streams.length > 1 && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {channel.streams.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setStreamIndex(i);
                  setViaProxy(isHttp(channel.streams[i]?.url ?? ""));
                  setAttempt((a) => a + 1);
                  setStatus("loading");
                  setNote(`Source ${i + 1}`);
                }}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold border transition ${
                  i === streamIndex
                    ? "bg-red-600/30 border-red-500/50 text-red-300"
                    : "bg-white/5 border-white/10 text-white/50 hover:text-white"
                }`}
              >
                Source {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
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
  const [playing, setPlaying] = useState<ChannelTile | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/channels");
        if (!res.ok) throw new Error(`Could not load catalogue (${res.status})`);
        const data: WorldPayload = await res.json();
        if (!cancelled) {
          setPayload(data);
          const tiles = groupStreams(data.streams || []);
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

  const allTiles = useMemo(
    () => (payload ? groupStreams(payload.streams || []) : []),
    [payload]
  );

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

  const filteredTiles = useMemo(() => {
    if (view === "favorites") {
      const set = new Set(favorites);
      return allTiles.filter((t) => set.has(t.channelId));
    }
    let list = allTiles;
    if (country !== ALL) list = list.filter((t) => t.country === country);
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

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, category, country, view]);

  const visibleTiles = filteredTiles.slice(0, visibleCount);
  const totals = payload?.totals;
  const countries = payload?.countries ?? [];

  if (loadError) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500" />
        <p className="text-lg font-semibold">Could not load live channels</p>
        <p className="text-sm text-white/50 text-center max-w-sm">{loadError}</p>
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
        {/* Header */}
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

        {/* Search */}
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
            className="w-full rounded-2xl border border-white/10 bg-[#12121a] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition"
          />
        </div>

        {/* Browse / Favorites */}
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

        {/* Countries */}
        {view === "browse" && (
          <div className="mb-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
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

        {/* Categories */}
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
                      : "bg-[#12121a] text-white/65 border-white/10 hover:bg-white/8 hover:text-white"
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

        {/* Preview card */}
        <div className="rounded-2xl border border-white/10 bg-[#0e0e14] overflow-hidden shadow-2xl mb-5">
          <button
            type="button"
            onClick={() => selected && setPlaying(selected)}
            className="relative aspect-video w-full bg-black flex flex-col items-center justify-center gap-3 group"
            disabled={!selected}
          >
            {selected?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.logo}
                alt=""
                className="absolute inset-0 h-full w-full object-contain opacity-30 p-8"
              />
            ) : null}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600/90 shadow-lg group-hover:scale-105 transition">
                <Play className="h-7 w-7 fill-white text-white ml-1" />
              </div>
              <p className="text-sm font-semibold text-white/80">
                {selected ? "Tap to watch" : "Select a channel"}
              </p>
              {selected && (
                <p className="text-xs text-white/45 max-w-xs text-center truncate px-4">
                  {selected.name}
                </p>
              )}
            </div>
          </button>

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
                      <span className="rounded-md bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-white/55">
                        {selected.streams.length} sources
                      </span>
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
                >
                  <Star
                    className={`h-4 w-4 ${
                      favorites.includes(selected.channelId)
                        ? "fill-current"
                        : ""
                    }`}
                  />
                </button>
              </div>
              <button
                onClick={() => setPlaying(selected)}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 py-3 text-sm font-bold text-white transition"
              >
                <Play className="h-4 w-4 fill-white" />
                Watch now
              </button>
            </div>
          )}
        </div>

        {/* Channel list */}
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
                      onClick={() => {
                        setSelected(ch);
                        setPlaying(ch);
                      }}
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

      {/* Full-screen fab player */}
      {playing && (
        <FabPlayer channel={playing} onClose={() => setPlaying(null)} />
      )}
    </div>
  );
}
