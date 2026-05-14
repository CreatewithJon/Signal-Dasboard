import { NextRequest, NextResponse } from "next/server";

async function tryHiggsfield(prompt: string, duration: number, apiKey: string): Promise<string> {
  const response = await fetch("https://api.higgsfield.ai/v1/asset/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ prompt, duration, aspect_ratio: "16:9", model: "animate-diff" }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Higgsfield ${response.status}: ${err}`);
  }

  const data = await response.json();
  const jobId = data.id ?? data.asset_id ?? data.job_id;
  if (!jobId) throw new Error("Higgsfield returned no job ID");
  return `higgsfield:${jobId}`;
}

async function tryRunway(prompt: string, duration: number, apiKey: string): Promise<string> {
  const response = await fetch("https://api.dev.runwayml.com/v1/text_to_video", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify({
      promptText: prompt,
      model: "gen4.5",
      ratio: "1280:720",
      duration: Math.min(Math.max(duration, 5), 10),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Runway ${response.status}: ${err}`);
  }

  const data = await response.json();
  const jobId = data.id ?? data.task_id;
  if (!jobId) throw new Error("Runway returned no job ID");
  return `runway:${jobId}`;
}

export async function POST(req: NextRequest) {
  const higgsfieldKey = process.env.HIGGSFIELD_API_KEY;
  const runwayKey = process.env.RUNWAY_API_KEY;

  if (!higgsfieldKey && !runwayKey) {
    return NextResponse.json({ error: "No video generation API key configured." }, { status: 503 });
  }

  let body: { prompt?: string; duration?: number };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const { prompt, duration = 4 } = body;
  if (!prompt) return NextResponse.json({ error: "No prompt provided." }, { status: 400 });

  // Try Higgsfield first
  if (higgsfieldKey) {
    try {
      const jobId = await tryHiggsfield(prompt, duration, higgsfieldKey);
      return NextResponse.json({ jobId, provider: "higgsfield" });
    } catch (err) {
      console.warn("Higgsfield failed, falling back to Runway:", err instanceof Error ? err.message : err);
      if (!runwayKey) {
        return NextResponse.json({ error: "Higgsfield unavailable and no Runway fallback configured.", details: err instanceof Error ? err.message : String(err) }, { status: 502 });
      }
    }
  }

  // Fallback: Runway
  try {
    const jobId = await tryRunway(prompt, duration, runwayKey!);
    return NextResponse.json({ jobId, provider: "runway" });
  } catch (err) {
    console.error("Runway also failed:", err);
    return NextResponse.json({ error: "All video generation services failed.", details: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
