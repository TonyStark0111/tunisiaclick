import { NextRequest, NextResponse } from "next/server";
import { BASE_CHANNELS, type LiveChannelData } from "@/src/lib/live-channels";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category')?.toLowerCase() || 'all';
    const query = searchParams.get('q')?.toLowerCase()?.trim() || '';
    const statusFilter = searchParams.get('status')?.toLowerCase() || 'all';

    const youtubeApiKey = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY;

    let allChannels: LiveChannelData[] = [...BASE_CHANNELS];

    // If dynamic YouTube search query is provided and API key is configured, search YouTube Live directly
    if (query && youtubeApiKey) {
      try {
        const ytRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&eventType=live&type=video&maxResults=10&q=${encodeURIComponent(
            query
          )}&key=${youtubeApiKey}`,
          { next: { revalidate: 300 } }
        );

        if (ytRes.ok) {
          const ytData = await ytRes.json();
          if (Array.isArray(ytData.items)) {
            const dynamicYt: LiveChannelData[] = ytData.items
              .filter((item: Record<string, unknown>) => {
                const id = item.id as Record<string, unknown> | undefined;
                return Boolean(id?.videoId);
              })
              .map((item: Record<string, unknown>) => {
                const id = item.id as { videoId: string };
                const snippet = item.snippet as {
                  title?: string;
                  channelTitle?: string;
                  channelId?: string;
                  description?: string;
                  thumbnails?: {
                    high?: { url: string };
                    medium?: { url: string };
                    default?: { url: string };
                  };
                };

                const thumb =
                  snippet.thumbnails?.high?.url ||
                  snippet.thumbnails?.medium?.url ||
                  snippet.thumbnails?.default?.url ||
                  'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=320&auto=format&fit=crop&q=80';

                return {
                  id: `yt-${id.videoId}`,
                  name: snippet.title || 'YouTube Live Stream',
                  channelTitle: snippet.channelTitle || 'YouTube Live',
                  channelId: snippet.channelId,
                  videoId: id.videoId,
                  category: 'others' as const,
                  country: '🔴',
                  thumbnail: thumb,
                  embedUrl: `https://www.youtube.com/embed/${id.videoId}?autoplay=1`,
                  status: 'live' as const,
                  isLive: true,
                  sourceType: 'youtube' as const,
                  description: snippet.description || 'Live stream broadcast on YouTube.',
                };
              });

            // Prepend verified live search results
            allChannels = [...dynamicYt, ...allChannels];
          }
        } else {
          console.warn(`[YouTube Live API] Query "${query}" returned status ${ytRes.status}`);
        }
      } catch (err) {
        console.warn('[YouTube Live API] Search fetch failed:', err);
      }
    }

    // Apply filtering
    let filtered = allChannels;

    if (category !== 'all') {
      filtered = filtered.filter((ch) => {
        if (category === 'science' || category === 'others') {
          return ch.category === 'science' || ch.category === 'others';
        }
        return ch.category === category;
      });
    }

    if (query) {
      filtered = filtered.filter((ch) => {
        const matchName = ch.name.toLowerCase().includes(query);
        const matchChannel = (ch.channelTitle || '').toLowerCase().includes(query);
        const matchCat = ch.category.toLowerCase().includes(query);
        const matchDesc = (ch.description || '').toLowerCase().includes(query);
        return matchName || matchChannel || matchCat || matchDesc;
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((ch) => ch.status === statusFilter);
    }

    return NextResponse.json({
      success: true,
      channels: filtered,
      total: filtered.length,
      hasApiKey: Boolean(youtubeApiKey),
    });
  } catch (error) {
    console.error('[API /api/live] Fatal handler error:', error);
    // Never crash; return baseline catalog
    return NextResponse.json({
      success: true,
      channels: BASE_CHANNELS,
      total: BASE_CHANNELS.length,
      hasApiKey: false,
      error: 'Fallback baseline data loaded',
    });
  }
}
