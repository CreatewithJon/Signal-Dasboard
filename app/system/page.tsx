/**
 * app/system/page.tsx — Sovereign OS v7.6
 *
 * Server component wrapper — reads env var flags, delegates to client inner page.
 */

import SystemHealthInner from "./_inner";

export const metadata = {
  title: "System Health — Sovereign OS",
  description: "Operational observability dashboard for Sovereign OS.",
};

export default function SystemPage() {
  return (
    <SystemHealthInner
      hasAnthropicKey={!!process.env.ANTHROPIC_API_KEY}
      hasOpenAIKey={!!process.env.OPENAI_API_KEY}
    />
  );
}
