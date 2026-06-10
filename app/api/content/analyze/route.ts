import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/ai";

const SYSTEM_PROMPT = `You are an expert YouTube content strategist and scriptwriter. Your job is to analyze successful YouTube videos and help creators replicate their success formula.

When analyzing videos, you extract what made them work — the hook, the structure, the emotional triggers — and then recreate that framework with fresh, original content.

Voice for rewritten scripts: Clear, sharp, confident. Focused on AI tools, Bitcoin, automation, digital wealth, and practical strategies for building income online. Direct and modern — not hypey, not corporate. Speaks to someone building a digital business and financial sovereignty.`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Anthropic API key not configured." },
      { status: 503 }
    );
  }

  let body: {
    videoId?: string;
    title?: string;
    description?: string;
    views?: number;
    outlierScore?: number;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const { title, description, views, outlierScore } = body;
  if (!title) return NextResponse.json({ error: "No title provided." }, { status: 400 });

  const prompt = `Analyze this YouTube video that is outperforming on the channel:

**Title:** ${title}
**Views:** ${views ? views.toLocaleString() : "unknown"}
**Outlier Score:** ${outlierScore ? `${outlierScore}x the channel average` : "unknown"}

**Description:**
${description ? description.slice(0, 2500) : "No description available."}

---

Please provide a full analysis in exactly these sections:

## 1. Hook Analysis
What is the hook strategy? Why does this title/thumbnail make people click? What emotional trigger does it use?

## 2. Content Framework
Break down the exact structure of this video step by step. What is the formula? (e.g., Problem → Agitation → Solution → Proof → CTA)

## 3. Keywords & Topics
List the 8-10 most important keywords and topics that are driving this video's performance. Format as a simple list.

## 4. Why It's an Outlier
What specifically makes this video outperform the channel average? Be specific about the strategy.

## 5. Rewritten Script (My Voice)
Write a complete video script using the exact same framework and hook structure, but for an audience interested in AI tools, Bitcoin, automation, and building digital income. Make it 100% original content. Include: hook, intro, main content sections, and a strong CTA.`;

  try {
    const analysis = await callClaude({
      messages: [{ role: "user", content: prompt }],
      system: SYSTEM_PROMPT,
      maxTokens: 4096,
      tag: "content-analyze",
    });
    const sections = parseAnalysis(analysis);

    return NextResponse.json({ analysis, sections });
  } catch (err) {
    console.error("Content analyze error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

function parseAnalysis(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const LABELS = [
    "Hook Analysis",
    "Content Framework",
    "Keywords & Topics",
    "Why It's an Outlier",
    "Rewritten Script (My Voice)",
  ];
  const parts = text.split(/##\s+\d+\.\s+/);
  parts.slice(1).forEach((part, i) => {
    if (LABELS[i]) {
      // Strip the label line if it's included
      const lines = part.split("\n");
      const content = lines[0].trim().toLowerCase().startsWith(LABELS[i].toLowerCase().slice(0, 6))
        ? lines.slice(1).join("\n").trim()
        : part.trim();
      sections[LABELS[i]] = content;
    }
  });
  return sections;
}
