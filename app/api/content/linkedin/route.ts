import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/ai";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Anthropic API key not configured." }, { status: 503 });
  }

  let body: { script?: string; title?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const { script, title } = body;
  if (!script) return NextResponse.json({ error: "No script provided." }, { status: 400 });

  const prompt = `You are a LinkedIn content strategist. Based on the following YouTube video script, write exactly 3 LinkedIn post variations.

Video title: ${title ?? "Untitled"}

Script:
${script.slice(0, 3000)}

---

Write 3 LinkedIn posts. Each should:
- Be 150–250 words
- Have a strong first line that stops the scroll
- Use line breaks for readability (short paragraphs)
- End with a question or CTA that drives comments
- Feel personal, direct, and valuable — not corporate
- Fit the themes of AI, Bitcoin, automation, and digital income

Format your response exactly like this:

### POST 1
[post content]

### POST 2
[post content]

### POST 3
[post content]`;

  try {
    const text = await callClaude({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 2048,
      tag: "content-linkedin",
    });
    const posts = parsePosts(text);

    return NextResponse.json({ posts });
  } catch (err) {
    console.error("LinkedIn generate error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

function parsePosts(text: string): string[] {
  const parts = text.split(/###\s+POST\s+\d+/i);
  return parts.slice(1).map((p) => p.trim()).filter(Boolean);
}
