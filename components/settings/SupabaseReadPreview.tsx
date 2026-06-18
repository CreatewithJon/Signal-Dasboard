"use client";

import { useState } from "react";
import {
  fetchSupabasePreview,
  type SupabasePreviewResult,
  type ModulePreview,
} from "@/lib/supabase/readPreview";
import { getCachedUserId } from "@/lib/supabase/authStatus";

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function DiffBadge({ diff }: { diff: number | null }) {
  if (diff === null) return <span style={{ color: "rgba(148,163,184,0.3)" }}>—</span>;
  if (diff === 0)
    return (
      <span style={{ color: "rgba(52,211,153,0.7)" }} title="In sync">
        ✓
      </span>
    );
  return (
    <span
      style={{ color: diff > 0 ? "rgba(245,158,11,0.75)" : "rgba(99,102,241,0.7)" }}
      title={diff > 0 ? `${diff} more in local` : `${Math.abs(diff)} more in Supabase`}
    >
      {diff > 0 ? `+${diff} local` : `${diff} remote`}
    </span>
  );
}

// ── Module row ─────────────────────────────────────────────────────────────

function ModuleRow({
  mod,
  expanded,
  onToggle,
}: {
  mod: ModulePreview;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer select-none"
        onClick={onToggle}
        style={{ opacity: mod.error ? 0.6 : 1 }}
      >
        <td className="pr-4 py-2" style={{ color: "rgba(255,255,255,0.75)" }}>
          <span className="flex items-center gap-1.5">
            <span
              className="text-[8px] transition-transform inline-block"
              style={{
                color: "rgba(148,163,184,0.4)",
                transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              ▶
            </span>
            {mod.label}
            {mod.error && (
              <span className="text-[9px] ml-1" style={{ color: "rgba(248,113,113,0.65)" }}>
                ⚠
              </span>
            )}
          </span>
        </td>
        <td className="pr-4 py-2 text-right text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
          {mod.localCount}
        </td>
        <td className="pr-4 py-2 text-right text-xs" style={{ color: "rgba(165,180,252,0.7)" }}>
          {mod.supabaseCount ?? "—"}
        </td>
        <td className="py-2 text-right text-xs">
          <DiffBadge diff={mod.difference} />
        </td>
      </tr>

      {/* Expanded: latest records */}
      {expanded && (
        <tr>
          <td colSpan={4} className="pb-3">
            <div
              className="ml-4 rounded-xl p-3"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              {mod.error ? (
                <p className="text-[10px]" style={{ color: "rgba(248,113,113,0.6)" }}>
                  Error: {mod.error}
                </p>
              ) : mod.latestRecords.length === 0 ? (
                <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.3)" }}>
                  No records in Supabase yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p
                    className="text-[8px] font-semibold uppercase tracking-[0.18em] mb-2"
                    style={{ color: "rgba(148,163,184,0.35)" }}
                  >
                    Latest 5 in Supabase
                  </p>
                  {mod.latestRecords.map((rec) => (
                    <div key={rec.id} className="flex items-center gap-3">
                      <span
                        className="font-mono text-[9px] shrink-0"
                        style={{ color: "rgba(148,163,184,0.3)" }}
                      >
                        {rec.id.slice(0, 8)}
                      </span>
                      <span
                        className="text-[10px] flex-1 truncate"
                        style={{ color: "rgba(255,255,255,0.55)" }}
                      >
                        {rec.title || "(no title)"}
                      </span>
                      <span
                        className="text-[9px] shrink-0"
                        style={{ color: "rgba(148,163,184,0.3)" }}
                      >
                        {timeAgo(rec.updatedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

type UIPhase = "idle" | "loading" | "loaded" | "error";

export default function SupabaseReadPreview() {
  const [phase, setPhase]       = useState<UIPhase>("idle");
  const [data, setData]         = useState<SupabasePreviewResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const isAuthenticated = getCachedUserId() !== null;

  async function handleFetch() {
    setPhase("loading");
    setErrorMsg("");
    const res = await fetchSupabasePreview();
    if (!res.ok) {
      setErrorMsg(res.error);
      setPhase("error");
      return;
    }
    setData(res.data);
    setPhase("loaded");
  }

  function toggleModule(module: string) {
    setExpanded((prev) => ({ ...prev, [module]: !prev[module] }));
  }

  // ── Not authenticated ────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full" style={{ background: "rgba(245,158,11,0.5)" }} />
          <span className="text-sm font-semibold" style={{ color: "rgba(245,158,11,0.75)" }}>
            Sign In Required
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
          Sign in via the Identity &amp; Auth section above to inspect your Supabase data.
        </p>
      </div>
    );
  }

  // ── Idle ─────────────────────────────────────────────────────────────────

  if (phase === "idle") {
    return (
      <div
        className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-xs leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>
          Reads table counts and the 5 most recently updated records from each Supabase
          module. Compares them against your local counts. Read-only — no changes are made.
        </p>
        <button
          onClick={handleFetch}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
          style={{
            background: "rgba(59,130,246,0.12)",
            color: "rgba(147,197,253,0.9)",
            border: "1px solid rgba(59,130,246,0.22)",
          }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <circle cx="8" cy="8" r="5.5" />
            <path d="M6 8h4M8 6v4" strokeLinecap="round" />
          </svg>
          Fetch Supabase Preview
        </button>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div
        className="rounded-2xl p-5 flex items-center gap-3"
        style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)" }}
      >
        <div className="w-4 h-4 rounded-full animate-pulse" style={{ background: "rgba(59,130,246,0.4)" }} />
        <span className="text-xs" style={{ color: "rgba(147,197,253,0.65)" }}>
          Fetching from Supabase…
        </span>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (phase === "error") {
    return (
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.15)" }}
      >
        <p className="text-xs font-semibold" style={{ color: "rgba(248,113,113,0.8)" }}>
          Fetch failed
        </p>
        <p className="text-xs" style={{ color: "rgba(248,113,113,0.6)" }}>{errorMsg}</p>
        <button
          onClick={() => setPhase("idle")}
          className="text-xs underline"
          style={{ color: "rgba(148,163,184,0.5)" }}
        >
          Reset
        </button>
      </div>
    );
  }

  // ── Loaded ────────────────────────────────────────────────────────────────

  if (phase === "loaded" && data) {
    const hasErrors = data.modules.some((m) => m.error);
    const allSynced = data.modules.every((m) => m.difference === 0);

    return (
      <div className="space-y-3">

        {/* Warning banner — always shown */}
        <div
          className="px-4 py-3 rounded-xl text-xs leading-relaxed"
          style={{ background: "rgba(245,158,11,0.07)", color: "rgba(245,158,11,0.75)", border: "1px solid rgba(245,158,11,0.13)" }}
        >
          <span className="font-semibold">Verification only.</span>{" "}
          Supabase is not yet the source of truth. The app reads from localStorage.
          This view shows what is stored in Supabase for comparison purposes only.
          {!allSynced && (
            <span> Differences are expected until a full migration has run.</span>
          )}
        </div>

        {/* Main panel */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p
                className="text-[9px] font-bold uppercase tracking-[0.2em] mb-0.5"
                style={{ color: "rgba(59,130,246,0.55)" }}
              >
                Supabase Read Preview
              </p>
              <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                Fetched {formatTime(data.fetchedAt)} · user {data.userId.slice(0, 8)}
              </p>
            </div>
            <button
              onClick={handleFetch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-opacity hover:opacity-70"
              style={{
                background: "rgba(59,130,246,0.1)",
                color: "rgba(147,197,253,0.8)",
                border: "1px solid rgba(59,130,246,0.18)",
              }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                <path d="M13 8A5 5 0 1 1 8 3" strokeLinecap="round" />
                <path d="M8 1v4h4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Comparison table */}
          <table className="w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ color: "rgba(148,163,184,0.4)" }}>
                <th className="text-left font-semibold pb-2 pr-4">Module</th>
                <th className="text-right font-semibold pb-2 pr-4">Local</th>
                <th className="text-right font-semibold pb-2 pr-4">Supabase</th>
                <th className="text-right font-semibold pb-2">Diff</th>
              </tr>
            </thead>
            <tbody>
              {data.modules.map((mod) => (
                <ModuleRow
                  key={mod.module}
                  mod={mod}
                  expanded={!!expanded[mod.module]}
                  onToggle={() => toggleModule(mod.module)}
                />
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <td className="pt-2 pr-4 text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Total
                </td>
                <td className="pt-2 pr-4 text-right text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {data.totalLocal}
                </td>
                <td className="pt-2 pr-4 text-right text-[10px] font-semibold" style={{ color: "rgba(165,180,252,0.65)" }}>
                  {data.totalSupabase ?? "—"}
                </td>
                <td className="pt-2 text-right text-[10px] font-semibold">
                  <DiffBadge diff={data.totalDifference} />
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Error summary */}
          {hasErrors && (
            <div
              className="mt-4 px-3 py-2.5 rounded-xl text-[10px]"
              style={{ background: "rgba(248,113,113,0.06)", color: "rgba(248,113,113,0.65)", border: "1px solid rgba(248,113,113,0.1)" }}
            >
              {data.modules
                .filter((m) => m.error)
                .map((m) => (
                  <p key={m.module}>
                    <span className="font-semibold">{m.label}:</span> {m.error}
                  </p>
                ))}
            </div>
          )}

          <p className="mt-4 text-[10px]" style={{ color: "rgba(148,163,184,0.3)" }}>
            Click any row to expand the latest Supabase records for that module.
            All counts reflect total rows in the table — user scoping activates in v4.7 (RLS).
          </p>
        </div>
      </div>
    );
  }

  return null;
}
