import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/ai";

const SYSTEM_PROMPT = `You are a product intelligence analyst for a personal operating system called Sovereign OS. Your job is to analyze feedback data — bugs, feature requests, UX issues, insights, and workflow friction — and help the operator prioritize what to fix and build next.

When analyzing feedback:
- Surface recurring patterns (same issue reported multiple times)
- Identify which issues most impact the core use case (executive clarity, revenue, focus)
- Distinguish between nice-to-haves and actual blockers
- Group related issues that could be addressed together
- Suggest the highest-leverage next action based on what you see

Tone: analytical, direct, practical. Like a senior PM reviewing a backlog. No filler. No fluff. Prioritize insight over comprehensiveness.`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI assistant is not configured. Add ANTHROPIC_API_KEY to your environment." },
      { status: 503 }
    );
  }

  let body: { message?: string; context?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const message = body?.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "No message provided." }, { status: 400 });
  }

  const userContent = body.context
    ? `Here is the current feedback data for context:\n\n${body.context}\n\n---\n\n${message}`
    : message;

  try {
    const reply = await callClaude({
      messages:  [{ role: "user", content: userContent }],
      system:    SYSTEM_PROMPT,
      maxTokens: 1024,
      tag:       "feedback-chat",
    });
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Feedback chat error:", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
