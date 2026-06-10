import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/ai";

const SYSTEM_PROMPT = `You are a personal brand strategist and copywriter for Jonathan Cardona.

Jonathan's positioning: "Helping everyday people and businesses leverage AI, automation, Bitcoin, and emerging technology to create more freedom, ownership, and opportunity."

About Jonathan:
- First-generation Mexican-American, born in East LA
- Self-taught builder — no CS degree, no elite tech background
- Worked in banking and financial services, worked at Tesla
- Now builds AI systems and automation for businesses independently
- Founder of Digital Wealth Transfer (digitalwealthtransfer.com)
- Deep interest in AI implementation, Bitcoin, automation, decentralization, sovereignty

Brand voice:
- Approachable and intelligent — never condescending
- Practical and grounded — not theoretical or abstract
- Optimistic about technology and what it makes possible
- Non-corporate — real voice, not polished PR
- Visionary without sounding delusional
- Educational without overwhelming people
- Authentic — leads with his real story

What he is NOT:
- A fake guru or hype merchant
- A crypto scammer
- A corporate consultant
- A generic AI influencer

Content pillars:
1. AI + automation practical use cases
2. Bitcoin and digital ownership
3. Emerging technology explained simply
4. Entrepreneurship and leverage
5. Building in public (honest documentation)
6. Faith, discipline, purpose
7. Technology made accessible for regular people

Always write in first person as Jonathan. Match the requested format exactly. Be specific, not generic. Use real details when possible.`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Anthropic API key not configured." }, { status: 503 });
  }

  let body: { platform?: string; contentType?: string; topic?: string; context?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const { platform, contentType, topic, context } = body;
  if (!platform || !contentType || !topic) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const formatInstructions: Record<string, string> = {
    "linkedin-post": `Write a LinkedIn post (150–250 words). Use short paragraphs for readability. Start with a strong first line that stops the scroll. End with a question or CTA. No hashtag spam — 2–3 relevant hashtags max at the end.`,
    "linkedin-about": `Write a LinkedIn About section (300–400 words). Start with a hook. Tell the real story — East LA, banking, Tesla, self-taught builder. Be human. End with a clear CTA to DM or visit the website.`,
    "x-thread": `Write an X/Twitter thread (8–12 tweets). Number each tweet (1/, 2/, etc.). First tweet is the hook — make it impossible not to click. Last tweet is a CTA or summary. Keep each tweet under 280 characters. Be punchy and direct.`,
    "x-post": `Write a single X/Twitter post (under 280 characters). One sharp idea. Direct. No fluff. Optionally end with a hook question.`,
    "x-bio": `Write an X/Twitter bio (under 160 characters). Includes positioning, what he builds, and a nod to the mission. Clean and direct.`,
    "youtube-script": `Write a complete YouTube video script (8–12 minutes when read aloud at normal pace). Include: Hook (first 30 seconds — lead with the outcome), Brief intro (who Jonathan is), Main content (step-by-step or structured breakdown), CTA (subscribe, DM, visit DWT). Use [PAUSE] and [B-ROLL: description] markers. Write conversationally — exactly how someone talks, not how they write.`,
    "youtube-titles": `Generate 10 YouTube title options for the given topic. Mix formats: how-to, story-based, contrarian, list-based, results-focused. Each title should be under 70 characters. Also provide 5 thumbnail text ideas (4–6 words max each).`,
    "youtube-description": `Write a YouTube video description (250–350 words). Start with 2–3 sentences summarizing the video value. Include timestamps placeholder section. Add relevant links section (DWT, LinkedIn, X). End with a CTA to subscribe. Include 10–15 relevant keywords naturally.`,
  };

  const formatKey = `${platform}-${contentType}`.toLowerCase().replace(/\s+/g, "-").replace(/\//g, "-");
  const format = formatInstructions[formatKey] ?? `Write ${contentType} content for ${platform}.`;

  const prompt = `${format}

Topic / Request: ${topic}
${context ? `Additional context: ${context}` : ""}

Write the content now. Be specific to Jonathan's real story and voice. Do not be generic.`;

  try {
    const draft = await callClaude({
      messages: [{ role: "user", content: prompt }],
      system: SYSTEM_PROMPT,
      maxTokens: 2048,
      tag: "content-draft",
    });
    return NextResponse.json({ draft });
  } catch (err) {
    console.error("Content draft error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
