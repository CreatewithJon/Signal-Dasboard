import { NextRequest, NextResponse } from "next/server";

async function checkHiggsfield(jobId: string, apiKey: string) {
  const response = await fetch(`https://api.higgsfield.ai/v1/asset/${jobId}`, {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error(`Higgsfield status ${response.status}`);
  const data = await response.json();
  return {
    status: data.status ?? "pending",
    url: data.url ?? data.video_url ?? data.output_url ?? null,
  };
}

async function checkRunway(jobId: string, apiKey: string) {
  const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${jobId}`, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "X-Runway-Version": "2024-11-06",
    },
  });
  if (!response.ok) throw new Error(`Runway status ${response.status}`);
  const data = await response.json();

  // Runway statuses: PENDING, RUNNING, SUCCEEDED, FAILED
  let status = "pending";
  if (data.status === "SUCCEEDED") status = "completed";
  else if (data.status === "FAILED") status = "failed";

  const url = data.output?.[0] ?? null;
  return { status, url };
}

export async function GET(req: NextRequest) {
  const rawJobId = req.nextUrl.searchParams.get("jobId");
  if (!rawJobId) return NextResponse.json({ error: "No jobId provided." }, { status: 400 });

  // Parse provider prefix: "higgsfield:abc123" or "runway:abc123"
  const [provider, ...rest] = rawJobId.split(":");
  const jobId = rest.join(":");

  if (provider === "runway") {
    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Runway API key not configured." }, { status: 503 });
    try {
      const result = await checkRunway(jobId, apiKey);
      return NextResponse.json(result);
    } catch (err) {
      return NextResponse.json({ error: "Runway status check failed.", details: err instanceof Error ? err.message : String(err) }, { status: 502 });
    }
  }

  // Default: higgsfield
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Higgsfield API key not configured." }, { status: 503 });
  try {
    const result = await checkHiggsfield(jobId, apiKey);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "Higgsfield status check failed.", details: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
