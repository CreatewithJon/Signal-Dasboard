import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/ai";

export interface BRollMoment {
  id: string;
  timestamp: number;
  duration: number;
  description: string;
  prompt: string;
  quote: string;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Anthropic API key not configured." }, { status: 503 });
  }

  let body: { transcript?: string; segments?: { start: number; end: number; text: string }[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const { transcript, segments } = body;
  if (!transcript) return NextResponse.json({ error: "No transcript provided." }, { status: 400 });

  const segmentText = segments
    ? segments.map((s) => `[${s.start}s–${s.end}s] ${s.text}`).join("\n")
    : transcript;

  const prompt = `You are a video editor and B-roll director. Analyze this transcript from a talking-head video and identify 6–8 moments that would benefit most from B-roll footage.

TRANSCRIPT WITH TIMESTAMPS:
${segmentText}

For each B-roll moment, provide:
1. The timestamp where B-roll should start
2. Duration (3–6 seconds)
3. A short description of what visual would enhance this moment
4. A detailed AI video generation prompt for Higgsfield (cinematic, descriptive, specific)
5. The exact quote from the transcript this covers

Return ONLY a valid JSON array with this exact structure — no other text:
[
  {
    "id": "moment_1",
    "timestamp": 12.5,
    "duration": 4,
    "description": "Show a glowing AI dashboard on a dark screen",
    "prompt": "Cinematic close-up of a futuristic AI dashboard with glowing blue data visualizations on a dark background, smooth camera pull-back, premium tech aesthetic, 4K quality",
    "quote": "the exact words from the transcript"
  }
]

Guidelines for prompts:
- Be cinematic and specific — describe camera movement, lighting, mood
- Keep it relevant to what the speaker is saying
- Avoid faces/people — focus on concepts, technology, environments, objects
- Style: dark, premium, futuristic where appropriate
- Each prompt should be 1–2 sentences, highly descriptive`;

  try {
    const text = await callClaude({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 2048,
      tag: "broll-plan",
    });

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse B-roll plan." }, { status: 500 });
    }

    const moments: BRollMoment[] = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ moments });
  } catch (err) {
    console.error("Plan error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
