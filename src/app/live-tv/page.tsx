"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Tv,
  Search,
  Play,
  RefreshCw,
  AlertTriangle,
  Wifi,
  Radio,
} from "lucide-react";
import Hls from "hls.js";
import {
  BASE_CHANNELS,
  type LiveChannelData,
} from "@/src/lib/live-channels";

type Category =
  | "all"
  | "news"
  | "sports"
  | "entertainment"
  | "kids"
  | "science"
  | "music"
  | "gaming";

const CATEGORY_LABELS: { id: Category; label: string; emoji: string }[] = [
  { id: "all", label: "All", emoji: "📺" },
  { id: "news", label: "News", emoji: "📰" },
  { id: "sports", label: "Sports", emoji: "⚽" },
  { id: "entertainment", label: "Entertainment", emoji: "🎬" },
  { id: "kids", label: "Kids & Cartoons", emoji: "🧒" },
  { id: "science", label: "Science & Docs", emoji: "🔬" },
  { id: "music", label: "Music & Relax", emoji: "🎵" },
  { id: "gaming", label: "Gaming & Tech", emoji: "🎮" },
];

function HlsPlayer({ src, onError }: { src: string; onError: () => void }) {
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

export default function LiveTvPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [channels, setChannels] =
    useState<LiveChannelData[]>(BASE_CHANNELS);
  const [selectedChannel, setSelectedChannel] = useState<LiveChannelData>(
    BASE_CHANNELS[0]
  );
  const [hlsFailed, setHlsFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const fetchChannels = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) {
          params.set("q", searchQuery.trim());
        } else if (category !== "all") {
          params.set("category", category);
        }

        const res = await fetch(`/api/live?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && Array.isArray(data.channels)) {
            setChannels(data.channels);
            // Keep selection valid
            if (
              data.channels.length > 0 &&
              !data.channels.find(
                (c: LiveChannelData) => c.id === selectedChannel.id
              )
            ) {
              setSelectedChannel(data.channels[0]);
            }
          }
        }
      } catch (err) {
        console.warn(
          "Could not fetch dynamic live channels, using baseline catalog:",
          err
        );
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchChannels, 150);
    return () => {
      isCancelled = true;
      clearTimeout(debounceTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, searchQuery]);

  useEffect(() => {
    setHlsFailed(false);
  }, [selectedChannel.id]);

  const categoryCounts = BASE_CHANNELS.reduce<Record<Category, number>>(
    (acc, ch) => {
      const catKey =
        ch.category === "others" ? "science" : (ch.category as Category);
      acc[catKey] = (acc[catKey] || 0) + 1;
      acc.all = (acc.all || 0) + 1;
      return acc;
    },
    {
      all: 0,
      news: 0,
      sports: 0,
      entertainment: 0,
      kids: 0,
      science: 0,
      music: 0,
      gaming: 0,
    }
  );

  const isDirectHlsPreferred =
    selectedChannel.sourceType === "hls" &&
    Boolean(selectedChannel.hlsUrl) &&
    !hlsFailed;
  const useHls = isDirectHlsPreferred;
  const useEmbed = !useHls && Boolean(selectedChannel.embedUrl);
  const handleHlsError = useCallback(() => setHlsFailed(true), []);

  return (
    <div className="min-h-screen bg-black text-white pb-8">
      <div className="mx-auto max-w-5xl px-4 pt-6 md:px-6">
        {/* ── Header (matches Lumina) ── */}
        <div className="mb-5">
          <div className="flex items-center gap-2.5 mb-1">
            <Tv className="h-7 w-7 text-red-500" strokeWidth={2.2} />
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Live TV
            </h1>
          </div>
          <p className="text-sm text-white/45 leading-relaxed">
            {BASE_CHANNELS.length}+ verified 24/7 channels · Stream live in
            your browser
          </p>
        </div>

        {/* ── Search ── */}
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            type="search"
            placeholder="Search channels, news, streams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#12121a] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/30 transition"
          />
        </div>

        {/* ── Category chips ── */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORY_LABELS.map(({ id, label, emoji }) => {
            const active = category === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setCategory(id);
                  setSearchQuery("");
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold border transition-all ${
                  active
                    ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-900/30"
                    : "bg-[#12121a] text-white/65 border-white/10 hover:bg-white/8 hover:text-white hover:border-white/20"
                }`}
              >
                <span className="text-sm leading-none">{emoji}</span>
                {label}
                {categoryCounts[id] > 0 && (
                  <span
                    className={`ml-0.5 min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${
                      active
                        ? "bg-white/25 text-white"
                        : "bg-white/10 text-white/45"
                    }`}
                  >
                    {categoryCounts[id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Player card ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0e0e14] overflow-hidden shadow-2xl mb-5">
          {/* Video */}
          <div className="relative aspect-video w-full bg-black">
            {useHls && selectedChannel.hlsUrl ? (
              <HlsPlayer
                key={`hls-${selectedChannel.id}`}
                src={selectedChannel.hlsUrl}
                onError={handleHlsError}
              />
            ) : useEmbed && selectedChannel.embedUrl ? (
              <iframe
                key={`embed-${selectedChannel.id}`}
                src={selectedChannel.embedUrl}
                className="w-full h-full"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                title={`Live TV – ${selectedChannel.name}`}
                style={{ border: "none" }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-white/40 p-6 text-center">
                <AlertTriangle className="w-10 h-10 text-yellow-500" />
                <p className="text-sm font-semibold text-white/70">
                  Live broadcast temporarily unavailable
                </p>
                <p className="text-xs text-white/40 max-w-sm">
                  This stream might be offline. Try another channel or retry.
                </p>
                <button
                  onClick={() => setHlsFailed(false)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Stream
                </button>
              </div>
            )}
          </div>

          {/* Channel info under player */}
          <div className="px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2 mb-0.5">
              {selectedChannel.country && (
                <span className="text-lg leading-none">
                  {selectedChannel.country}
                </span>
              )}
              <h2 className="text-lg font-bold text-white leading-tight">
                {selectedChannel.name}
              </h2>
            </div>
            {selectedChannel.channelTitle &&
              selectedChannel.channelTitle !== selectedChannel.name && (
                <p className="text-xs text-white/40 font-medium mb-2">
                  {selectedChannel.channelTitle}
                </p>
              )}

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                LIVE NOW
              </span>
              <span className="text-white/20 text-xs">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-white/50 capitalize">
                <Wifi className="h-3 w-3 text-white/40" />
                {selectedChannel.category}
              </span>
              <span className="text-white/20 text-xs">·</span>
              <span className="rounded-md bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-white/55">
                {selectedChannel.sourceType === "youtube"
                  ? "YouTube Live"
                  : "Direct HLS"}
              </span>
            </div>

            {selectedChannel.description && (
              <p className="mt-3 text-xs leading-relaxed text-white/40 line-clamp-3">
                {selectedChannel.description}
              </p>
            )}
          </div>
        </div>

        {/* ── Channels list ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0e0e14] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-red-400" />
              <h3 className="text-sm font-bold text-white/90">
                Channels
              </h3>
              <span className="text-xs text-white/40">
                ({channels.length})
              </span>
            </div>
            {isLoading && (
              <RefreshCw className="h-3.5 w-3.5 text-white/35 animate-spin" />
            )}
          </div>

          {channels.length > 0 ? (
            <div className="divide-y divide-white/5 max-h-[min(60vh,520px)] overflow-y-auto">
              {channels.map((ch) => {
                const isActive = selectedChannel.id === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setSelectedChannel(ch);
                      // On mobile, scroll player into view
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isActive
                        ? "bg-red-600/12"
                        : "hover:bg-white/5"
                    }`}
                  >
                    {/* Thumbnail */}
                    {ch.thumbnail ? (
                      <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ch.thumbnail}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse ring-1 ring-black/40" />
                      </div>
                    ) : (
                      <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-white/5 text-lg">
                        {ch.country || "📺"}
                      </div>
                    )}

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-semibold ${
                          isActive ? "text-white" : "text-white/85"
                        }`}
                      >
                        {ch.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-tight text-red-400">
                          ● LIVE
                        </span>
                        {ch.sourceType === "hls" ? (
                          <span className="text-[10px] font-semibold text-emerald-400">
                            ● Direct HLS
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-rose-400">
                            ● YouTube Live
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Play indicator when active */}
                    {isActive && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600/20">
                        <Play className="h-3.5 w-3.5 fill-red-400 text-red-400" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-14 text-center text-white/35">
              <Tv className="h-9 w-9 text-white/20" />
              <p className="text-xs">No live channels match your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
