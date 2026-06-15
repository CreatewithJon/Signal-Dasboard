import { NextRequest } from "next/server";

const SYSTEM_PROMPT = `You are a focused project management assistant embedded in Sovereign OS — a personal command center for builders and entrepreneurs.

Your job is to help the user think clearly and move fast on their projects.

You help with:
- Summarizing projects in plain language
- Breaking projects into concrete, actionable next steps
- Generating focused task lists
- Identifying what to work on today based on priority and momentum
- Spotting blockers and suggesting how to remove them

Tone: direct, practical, decisive. Like a sharp co-founder who's done the work and doesn't waste words.

Rules:
- Be specific — no generic advice
- Prefer concrete actions over abstract strategy
- Format task lists as numbered or bulleted lists
- Keep responses tight: 4-8 lines unless more detail is explicitly needed
- Never say "Great question!" or add filler
- Speak to a builder who values clarity and execution, not motivation`;

function buildRequest(message: string) {
  const useHelicone = !!process.env.HELICONE_API_KEY;
  const baseURL = useHelicone
    ? "https://anthropic.helicone.ai"
    : "https://api.anthropic.com";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY!,
    "anthropic-version": "2023-06-01",
  };
  if (useHelicone) {
    headers["Helicone-Auth"] = `Bearer ${process.env.HELICONE_API_KEY}`;
    headers["Helicone-Property-Feature"] = "project-chat";
  }

  return {
    url: `${baseURL}/v1/messages`,
    headers,
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 768,
      system: SYSTEM_PROMPT,
      stream: true,
      messages: [{ role: "user", content: message }],
    }),
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "AI assistant is not configured." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const message = body?.message?.trim();
  if (!message) {
    return new Response(
      JSON.stringify({ error: "No message provided." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { url, headers, body: reqBody } = buildRequest(message);

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch(url, { method: "POST", headers, body: reqBody });
  } catch (err) {
    console.error("Anthropic fetch error:", err);
    return new Response(
      JSON.stringify({ error: "Could not reach AI service." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!anthropicRes.ok || !anthropicRes.body) {
    const text = await anthropicRes.text().catch(() => "(no body)");
    console.error("Anthropic error:", anthropicRes.status, text);
    return new Response(
      JSON.stringify({ error: "AI service error. Try again." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const upstream = anthropicRes.body;
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const reader = upstream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;

            let event: Record<string, unknown>;
            try {
              event = JSON.parse(data) as Record<string, unknown>;
            } catch {
              continue;
            }

            if (
              event.type === "content_block_delta" &&
              typeof event.delta === "object" &&
              event.delta !== null
            ) {
              const delta = event.delta as Record<string, unknown>;
              if (delta.type === "text_delta" && typeof delta.text === "string") {
                controller.enqueue(encoder.encode(delta.text));
              }
            }
          }
        }
      } catch (err) {
        console.error("Stream read error:", err);
        controller.error(err);
        return;
      } finally {
        reader.releaseLock();
      }

      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Accel-Buffering": "no",
      "Cache-Control": "no-cache",
    },
  });
}
