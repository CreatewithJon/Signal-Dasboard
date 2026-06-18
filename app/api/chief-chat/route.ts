import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/ai";

const SYSTEM_PROMPT = `You are a Chief of Staff AI advisor for a solo operator and entrepreneur. Your role is to challenge plans, identify blind spots, surface hidden assumptions, and propose better sequencing when warranted.

When reviewing a plan or brief:
- Challenge assumptions that are taken for granted
- Identify what is missing or underweighted
- Point out sequencing issues (doing C before A)
- Flag concentration risk (too much riding on one bet)
- Suggest the most overlooked leverage point
- Be honest about execution risk

Tone: direct, strategic, respectful. Like a trusted advisor who has seen many operators make the same mistakes. No sycophancy. No corporate speak. Concrete, actionable, honest. Short answers where possible — don't pad.`;

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

  // Prepend brief context if provided
  const userContent = body.context
    ? `Here is my current Chief of Staff brief for context:\n\n${body.context}\n\n---\n\n${message}`
    : message;

  try {
    const reply = await callClaude({
      messages: [{ role: "user", content: userContent }],
      system:   SYSTEM_PROMPT,
      maxTokens: 1024,
      tag:      "chief-chat",
    });
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chief chat error:", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
