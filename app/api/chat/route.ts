import { NextRequest } from "next/server";

const SYSTEM_PROMPT = `You are a focused personal intelligence assistant embedded in Sovereign OS — a premium personal command center. Your purpose is to support three core themes:

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

function buildSystemPrompt(memoryContext?: string, contextSources?: string[]): string {
  if (!memoryContext) return SYSTEM_PROMPT;

  const sourceList =
    contextSources && contextSources.length > 0
      ? contextSources.join(", ")
      : "Saved Context";

  return `${SYSTEM_PROMPT}

---

${memoryContext}

Context sources for this response: ${sourceList}.

The above context is drawn from the user's own saved data inside Sovereign OS. Use it naturally when relevant. You may reference it with phrases like "based on your saved notes…", "your planner shows…", or "according to your vision…". Do not mention localStorage, internal key names, or technical implementation details. Do not fabricate details beyond what is explicitly provided above.`;
}

function buildAnthropicRequest(message: string, memoryContext?: string, contextSources?: string[]) {
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
    headers["Helicone-Property-Feature"] = "chat-stream";
  }

  return {
    url: `${baseURL}/v1/messages`,
    headers,
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: buildSystemPrompt(memoryContext, contextSources),
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

  let body: { message?: string; memoryContext?: string; contextSources?: string[] };
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

  // memoryContext is optional — only injected when relevant context was found
  const memoryContext =
    typeof body.memoryContext === "string" && body.memoryContext.trim()
      ? body.memoryContext.trim()
      : undefined;

  // contextSources is an optional string[] listing which sources are present
  const contextSources =
    Array.isArray(body.contextSources) && body.contextSources.length > 0
      ? (body.contextSources as string[]).filter((s) => typeof s === "string")
      : undefined;

  const { url, headers, body: reqBody } = buildAnthropicRequest(message, memoryContext, contextSources);

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
    console.error("Anthropic error response:", anthropicRes.status, text);
    return new Response(
      JSON.stringify({ error: "AI service error. Try again." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Transform Anthropic SSE → plain text stream ────────────────────────
  // Anthropic sends Server-Sent Events. We extract only the text_delta
  // values and stream raw UTF-8 text back to the client, keeping the
  // client-side parsing simple (no SSE parser needed).

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

          // Decode chunk and append to line buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines from buffer
          const lines = buffer.split("\n");
          // Keep the last (potentially incomplete) line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();

            // SSE data lines start with "data: "
            if (!trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            // Anthropic sends "[DONE]" to signal end — we handle it via `done`
            if (data === "[DONE]") continue;

            let event: Record<string, unknown>;
            try {
              event = JSON.parse(data) as Record<string, unknown>;
            } catch {
              continue; // skip malformed JSON
            }

            // Extract text from content_block_delta events
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
      // Prevent buffering in nginx/Vercel edge
      "X-Accel-Buffering": "no",
      "Cache-Control": "no-cache",
    },
  });
}
