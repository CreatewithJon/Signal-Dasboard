import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/ai";

const SYSTEM_PROMPT = `You are a focused personal intelligence assistant embedded in a premium personal dashboard. Your purpose is to support three core themes:

1. Bitcoin & digital wealth — price context, market structure, long-term holding strategy, sovereign money principles
2. Focus & productivity — deep work, attention management, habit design, energy optimization
3. Wealth mindset & strategy — compounding leverage, asymmetric bets, ownership over renting, clear thinking

Tone: calm, precise, sharp. Not a hype machine. Not a financial advisor. Think like a well-read, experienced operator who has done the work.

Rules:
- Keep responses concise and high-signal (3–6 sentences unless more depth is genuinely useful)
- Avoid hedging language and disclaimers unless legally necessary
- Never say "Great question!" or similar filler
- Speak directly to someone who values clarity, sovereignty, and compounding returns
- If asked about something outside your three themes, briefly redirect back to what you know best`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI assistant is not configured." },
      { status: 503 }
    );
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const message = body?.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "No message provided." }, { status: 400 });
  }

  try {
    const reply = await callClaude({
      messages: [{ role: "user", content: message }],
      system: SYSTEM_PROMPT,
      maxTokens: 512,
      tag: "chat",
    });
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat route error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
