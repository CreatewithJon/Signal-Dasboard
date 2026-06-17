import { NextRequest } from "next/server";
import type { ContentItem } from "@/lib/types/content";

function buildSystemPrompt(contentItem?: ContentItem, preset?: string): string {
  const base = `You are a content strategy and creation assistant for Jonathan Cardona — a creator building authority around AI, Bitcoin, automation, and digital wealth building.

Your role is to help craft content that educates, engages, and converts — without being hype-y or corporate. Match the voice: approachable and intelligent, practical and grounded, non-corporate, real.

Tone:
- Direct and specific. No generic advice.
- Optimistic about technology without sounding salesy.
- Educational without overwhelming people.
- Format responses cleanly with headers and bullets when listing.`;

  if (!contentItem) return base;

  const platformList = contentItem.platforms.join(", ") || "unspecified";
  const itemContext = [
    "",
    "## Content Item",
    `Title: ${contentItem.title}`,
    `Format: ${contentItem.format}`,
    `Platform(s): ${platformList}`,
    `Status: ${contentItem.status}`,
    `Priority: ${contentItem.priority}`,
    contentItem.description ? `Angle/Hook: ${contentItem.description}` : "",
    contentItem.notes ? `Notes/Draft: ${contentItem.notes}` : "",
    contentItem.publish_date ? `Publish Date: ${contentItem.publish_date}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (preset === "outline") {
    return `${base}${itemContext}

## Task
Generate a tight, structured outline for this content piece. Include:
- **Hook**: First 5-10 seconds or opening line (pattern interrupt or bold claim)
- **Structure**: 3-5 key sections or beats
- **Key points** per section (1-2 bullets each)
- **CTA / Closing**: What action or thought should the viewer/reader leave with?

Format it clearly for ${platformList}. Keep it executable, not theoretical.`;
  }

  if (preset === "repurpose") {
    return `${base}${itemContext}

## Task
Generate a repurposing plan that shows how to adapt this content across platforms. For each version:
- **Platform + Format**
- **New Hook/Angle** tuned for that audience
- **What to keep / cut / expand**
- **Rough length** (word count or seconds)

Prioritize the platforms already listed, then suggest 2-3 additional high-leverage formats.`;
  }

  return `${base}${itemContext}

Answer questions about this content piece. Help with hooks, structure, CTAs, repurposing, platform strategy, or draft copy.`;
}

function buildRequest(message: string, contentItem?: ContentItem, preset?: string) {
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
    headers["Helicone-Property-Feature"] = "content-chat";
  }

  return {
    url: `${baseURL}/v1/messages`,
    headers,
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: buildSystemPrompt(contentItem, preset),
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

  let body: { message?: string; contentItem?: ContentItem; preset?: string };
  try {
    body = await req.json() as { message?: string; contentItem?: ContentItem; preset?: string };
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

  const { url, headers, body: reqBody } = buildRequest(
    message,
    body.contentItem,
    body.preset
  );

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
