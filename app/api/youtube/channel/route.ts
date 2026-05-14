import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API key not configured." }, { status: 503 });
  }

  let body: { handle?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const raw = body?.handle?.trim() ?? "";
  const handle = raw.replace(/^@/, "");
  if (!handle) return NextResponse.json({ error: "No handle provided." }, { status: 400 });

  try {
    // 1. Try forHandle (@username — new style)
    let data = await ytFetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`
    );

    // 2. Try forUsername (legacy)
    if (!data.items?.length) {
      data = await ytFetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forUsername=${encodeURIComponent(handle)}&key=${apiKey}`
      );
    }

    // 3. Fall back to search
    if (!data.items?.length) {
      const search = await ytFetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&maxResults=1&key=${apiKey}`
      );
      if (search.items?.length) {
        const channelId = search.items[0].id.channelId;
        data = await ytFetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
        );
      }
    }

    if (!data.items?.length) {
      return NextResponse.json(
        { error: "Channel not found. Try the exact handle or channel name." },
        { status: 404 }
      );
    }

    const ch = data.items[0];
    return NextResponse.json({
      id: ch.id,
      title: ch.snippet.title,
      handle: ch.snippet.customUrl ?? `@${handle}`,
      subscribers: parseInt(ch.statistics.subscriberCount ?? "0"),
      videoCount: parseInt(ch.statistics.videoCount ?? "0"),
      thumbnail: ch.snippet.thumbnails?.default?.url ?? "",
      description: ch.snippet.description ?? "",
    });
  } catch (err) {
    console.error("YouTube channel error:", err);
    return NextResponse.json({ error: "Failed to fetch channel." }, { status: 500 });
  }
}

async function ytFetch(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  return res.json();
}
