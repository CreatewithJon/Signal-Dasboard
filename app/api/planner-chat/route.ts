import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a personal planning and execution assistant. Your job is to help the user connect long-term goals to daily action. Help the user organize life goals across daily, weekly, monthly, yearly, 3-year, and 5-year horizons. Always prioritize clarity, realistic execution, and momentum. Break big goals into projects, milestones, habits, and daily actions. Keep the user focused on the highest-impact tasks. Be honest when the user is overcommitted. Give structured answers with clear next steps.

Tone: calm, direct, sharp. Think like a seasoned operator and coach who has done the work. No filler, no hype. When asked to plan something, give a concrete structured plan immediately.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "AI assistant is not configured. Add ANTHROPIC_API_KEY to your environment." },
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
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return NextResponse.json({ error: "AI service unavailable. Try again." }, { status: 502 });
    }

    const data = await response.json();
    const reply: string = data?.content?.[0]?.text ?? "No response received.";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Planner chat error:", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
