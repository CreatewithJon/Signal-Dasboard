import { NextRequest, NextResponse } from "next/server";

interface YTSearchItem {
  id: { videoId: string };
}

interface YTVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      medium?: { url: string };
      default?: { url: string };
    };
  };
  statistics: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails: {
    duration: string;
  };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API key not configured." }, { status: 503 });
  }

  let body: { channelId?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const channelId = body?.channelId?.trim();
  if (!channelId) return NextResponse.json({ error: "No channelId provided." }, { status: 400 });

  try {
    // Fetch recent videos (up to 50)
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=50&order=date&type=video&key=${apiKey}`,
      { cache: "no-store" }
    );
    const searchData = await searchRes.json();

    if (!searchData.items?.length) {
      return NextResponse.json({ videos: [], avgViews: 0 });
    }

    const videoIds = (searchData.items as YTSearchItem[])
      .map((v) => v.id.videoId)
      .join(",");

    // Fetch video stats + details
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${apiKey}`,
      { cache: "no-store" }
    );
    const statsData = await statsRes.json();

    const videos = (statsData.items as YTVideoItem[]).map((v) => ({
      id: v.id,
      title: v.snippet.title,
      description: v.snippet.description,
      thumbnail:
        v.snippet.thumbnails?.medium?.url ??
        v.snippet.thumbnails?.default?.url ??
        "",
      publishedAt: v.snippet.publishedAt,
      views: parseInt(v.statistics.viewCount ?? "0"),
      likes: parseInt(v.statistics.likeCount ?? "0"),
      comments: parseInt(v.statistics.commentCount ?? "0"),
      duration: parseDuration(v.contentDetails.duration),
    }));

    // Calculate outlier scores
    const totalViews = videos.reduce((s, v) => s + v.views, 0);
    const avgViews = videos.length > 0 ? totalViews / videos.length : 0;

    const scored = videos
      .map((v) => ({
        ...v,
        outlierScore: avgViews > 0
          ? parseFloat((v.views / avgViews).toFixed(2))
          : 0,
      }))
      .sort((a, b) => b.outlierScore - a.outlierScore);

    return NextResponse.json({ videos: scored, avgViews: Math.round(avgViews) });
  } catch (err) {
    console.error("YouTube videos error:", err);
    return NextResponse.json({ error: "Failed to fetch videos." }, { status: 500 });
  }
}

function parseDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const h = match[1] ? `${match[1]}:` : "";
  const m = (match[2] ?? "0").padStart(h ? 2 : 1, "0");
  const s = (match[3] ?? "0").padStart(2, "0");
  return `${h}${m}:${s}`;
}
