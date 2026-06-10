interface CallClaudeOptions {
  model?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  system?: string;
  maxTokens?: number;
  tag?: string;
}

export async function callClaude({
  model = "claude-haiku-4-5-20251001",
  messages,
  system,
  maxTokens = 1024,
  tag = "general",
}: CallClaudeOptions): Promise<string> {
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
    headers["Helicone-Property-Feature"] = tag;
  }

  const res = await fetch(`${baseURL}/v1/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
  });

  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.content[0].text as string;
}
