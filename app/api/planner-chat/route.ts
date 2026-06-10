import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/ai";

const SYSTEM_PROMPT = `You are a personal planning and execution assistant. Your job is to help the user connect long-term goals to daily action. Help the user organize life goals across daily, weekly, monthly, yearly, 3-year, and 5-year horizons. Always prioritize clarity, realistic execution, and momentum. Break big goals into projects, milestones, habits, and daily actions. Keep the user focused on the highest-impact tasks. Be honest when the user is overcommitted. Give structured answers with clear next steps.

Tone: calm, direct, sharp. Think like a seasoned operator and coach who has done the work. No filler, no hype. When asked to plan something, give a concrete structured plan immediately.`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
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
    const reply = await callClaude({
      messages: [{ role: "user", content: message }],
      system: SYSTEM_PROMPT,
      maxTokens: 1024,
      tag: "planner-chat",
    });
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Planner chat error:", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
