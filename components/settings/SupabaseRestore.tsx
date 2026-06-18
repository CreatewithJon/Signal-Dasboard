"use client";

import { useState } from "react";
import {
  previewSupabaseRestore,
  restoreModuleFromSupabase,
  type RestoreModule,
  type RestoreMode,
  type RestorePreview,
  type RestoreModulePreview,
  type RestoreResult,
} from "@/lib/supabase/restoreFromSupabase";
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

function DiffLabel({ local, remote }: { local: number; remote: number | null }) {
  if (remote === null) return <span style={{ color: "rgba(148,163,184,0.3)" }}>—</span>;
  const diff = remote - local;
  if (diff === 0) return <span style={{ color: "rgba(52,211,153,0.7)" }}>✓ in sync</span>;
  if (diff > 0) return <span style={{ color: "rgba(99,102,241,0.75)" }}>+{diff} in Supabase</span>;
  return <span style={{ color: "rgba(245,158,11,0.7)" }}>{Math.abs(diff)} more local</span>;
}

// ── Module card ────────────────────────────────────────────────────────────

function ModuleCard({
  mod,
  selected,
  onSelect,
}: {
  mod: RestoreModulePreview;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-xl p-4 transition-all"
      style={{
        background: selected ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.02)",
        border: selected
          ? "1px solid rgba(99,102,241,0.3)"
          : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className="text-xs font-semibold"
          style={{ color: selected ? "rgba(165,180,252,0.9)" : "rgba(255,255,255,0.65)" }}
        >
          {mod.label}
        </span>
        {mod.error && (
          <span className="text-[9px]" style={{ color: "rgba(248,113,113,0.65)" }}>error</span>
        )}
      </div>
      <div className="flex items-center gap-4 text-[10px]">
        <span style={{ color: "rgba(255,255,255,0.35)" }}>Local: {mod.localCount}</span>
        <span style={{ color: "rgba(165,180,252,0.6)" }}>
          Supabase: {mod.supabaseCount ?? "—"}
        </span>
        <DiffLabel local={mod.localCount} remote={mod.supabaseCount} />
      </div>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

type UIPhase =
  | "idle"
  | "previewing"
  | "preview"       // showing module cards; user picks a module
  | "confirm"       // user picked a module + mode; confirm screen
  | "restoring"
  | "done"
  | "error";

export default function SupabaseRestore() {
  const [phase, setPhase]           = useState<UIPhase>("idle");
  const [preview, setPreview]       = useState<RestorePreview | null>(null);
  const [selectedMod, setSelectedMod] = useState<RestoreModule | null>(null);
  const [mode, setMode]             = useState<RestoreMode>("merge_by_id");
  const [confirmed, setConfirmed]   = useState(false);
  const [result, setResult]         = useState<RestoreResult | null>(null);
  const [errorMsg, setErrorMsg]     = useState("");

  const isAuthenticated = getCachedUserId() !== null;

  // ── Fetch preview ─────────────────────────────────────────────────────────

  async function handlePreview() {
    setPhase("previewing");
    setSelectedMod(null);
    setConfirmed(false);
    setResult(null);
    setErrorMsg("");
    const res = await previewSupabaseRestore();
    if (!res.ok) {
      setErrorMsg(res.error);
      setPhase("error");
      return;
    }
    setPreview(res.data);
    setPhase("preview");
  }

  // ── Proceed to confirm ────────────────────────────────────────────────────

  function handleContinue() {
    if (!selectedMod) return;
    setConfirmed(false);
    setPhase("confirm");
  }

  // ── Run restore ───────────────────────────────────────────────────────────

  async function handleRestore() {
    if (!selectedMod || !confirmed) return;
    setPhase("restoring");
    const res = await restoreModuleFromSupabase(selectedMod, { mode });
    if (!res.ok) {
      setErrorMsg(res.error);
      setPhase("error");
      return;
    }
    setResult(res.result);
    setPhase("done");
  }

  function handleReset() {
    setPhase("idle");
    setPreview(null);
    setSelectedMod(null);
    setConfirmed(false);
    setResult(null);
    setErrorMsg("");
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────

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
          Sign in via the Identity &amp; Auth section above to use Supabase restore.
        </p>
      </div>
    );
  }

  // ── Idle ──────────────────────────────────────────────────────────────────

  if (phase === "idle") {
    return (
      <div
        className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-xs leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>
          Pull Supabase data back into localStorage, one module at a time. A backup of the
          current local module data is automatically downloaded before any write.
          Supabase data is never modified.
        </p>
        <button
          onClick={handlePreview}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
          style={{
            background: "rgba(52,211,153,0.1)",
            color: "rgba(52,211,153,0.85)",
            border: "1px solid rgba(52,211,153,0.2)",
          }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <path d="M8 2v8M5 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 13h10" strokeLinecap="round" />
          </svg>
          Preview Restore Options
        </button>
      </div>
    );
  }

  // ── Previewing ────────────────────────────────────────────────────────────

  if (phase === "previewing") {
    return (
      <div
        className="rounded-2xl p-5 flex items-center gap-3"
        style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.12)" }}
      >
        <div className="w-4 h-4 rounded-full animate-pulse" style={{ background: "rgba(52,211,153,0.4)" }} />
        <span className="text-xs" style={{ color: "rgba(52,211,153,0.65)" }}>
          Fetching Supabase counts…
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
        <p className="text-xs font-semibold" style={{ color: "rgba(248,113,113,0.8)" }}>Error</p>
        <p className="text-xs" style={{ color: "rgba(248,113,113,0.6)" }}>{errorMsg}</p>
        <button onClick={handleReset} className="text-xs underline" style={{ color: "rgba(148,163,184,0.5)" }}>
          Reset
        </button>
      </div>
    );
  }

  // ── Preview: module selection ─────────────────────────────────────────────

  if (phase === "preview" && preview) {
    return (
      <div className="space-y-4">
        {/* Safety warning */}
        <div
          className="px-4 py-3 rounded-xl text-xs leading-relaxed"
          style={{ background: "rgba(245,158,11,0.07)", color: "rgba(245,158,11,0.75)", border: "1px solid rgba(245,158,11,0.13)" }}
        >
          <span className="font-semibold">Manual recovery only.</span>{" "}
          Restoring replaces or merges your local data with what is in Supabase.
          A backup is always downloaded before any write. Supabase data is never deleted.
          Restore one module at a time.
        </div>

        {/* Module cards */}
        <div className="space-y-2">
          {preview.modules.map((mod) => (
            <ModuleCard
              key={mod.module}
              mod={mod}
              selected={selectedMod === mod.module}
              onSelect={() => setSelectedMod(
                selectedMod === mod.module ? null : mod.module
              )}
            />
          ))}
        </div>

        {/* Latest records for selected module */}
        {selectedMod && (() => {
          const mod = preview.modules.find((m) => m.module === selectedMod)!;
          return mod.latestRecords.length > 0 ? (
            <div
              className="rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <p className="text-[8px] font-semibold uppercase tracking-[0.18em] mb-3"
                 style={{ color: "rgba(148,163,184,0.35)" }}>
                Latest 5 in Supabase — {mod.label}
              </p>
              <div className="space-y-1.5">
                {mod.latestRecords.map((rec) => (
                  <div key={rec.id} className="flex items-center gap-3">
                    <span className="font-mono text-[9px]" style={{ color: "rgba(148,163,184,0.3)" }}>
                      {rec.id.slice(0, 8)}
                    </span>
                    <span className="text-[10px] flex-1 truncate" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {rec.title}
                    </span>
                    <span className="text-[9px]" style={{ color: "rgba(148,163,184,0.3)" }}>
                      {timeAgo(rec.updatedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })()}

        {/* Continue button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleContinue}
            disabled={!selectedMod}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-30"
            style={{
              background: "rgba(99,102,241,0.15)",
              color: "rgba(165,180,252,0.9)",
              border: "1px solid rgba(99,102,241,0.25)",
            }}
          >
            {selectedMod
              ? `Continue with ${preview.modules.find((m) => m.module === selectedMod)?.label}`
              : "Select a module above"}
          </button>
          <button onClick={handleReset} className="text-xs underline" style={{ color: "rgba(148,163,184,0.4)" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Confirm: mode + checkbox ──────────────────────────────────────────────

  if (phase === "confirm" && preview && selectedMod) {
    const mod = preview.modules.find((m) => m.module === selectedMod)!;

    return (
      <div className="space-y-4">
        <div
          className="rounded-2xl p-5 space-y-5"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Selected module summary */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2"
               style={{ color: "rgba(148,163,184,0.4)" }}>
              Restoring
            </p>
            <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>
              {mod.label}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(148,163,184,0.4)" }}>
              Local: {mod.localCount} items · Supabase: {mod.supabaseCount ?? "—"} items
            </p>
          </div>

          {/* Mode picker */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3"
               style={{ color: "rgba(148,163,184,0.4)" }}>
              Restore Mode
            </p>
            <div className="space-y-2">
              {([
                {
                  value: "merge_by_id" as RestoreMode,
                  label: "Merge by ID (recommended)",
                  desc: "Keeps local items. Adds Supabase-only items. Replaces any item where Supabase has a newer updated_at.",
                },
                {
                  value: "replace_local_module" as RestoreMode,
                  label: "Replace local module",
                  desc: "Discards current local data for this module and writes all Supabase rows. Destructive — backup is required.",
                },
              ] as const).map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-start gap-3 cursor-pointer rounded-xl p-3 transition-all"
                  style={{
                    background: mode === opt.value ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
                    border: mode === opt.value ? "1px solid rgba(99,102,241,0.2)" : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <input
                    type="radio"
                    name="restoreMode"
                    value={opt.value}
                    checked={mode === opt.value}
                    onChange={() => setMode(opt.value)}
                    className="mt-0.5 shrink-0 accent-violet-400"
                  />
                  <div>
                    <p className="text-xs font-semibold mb-0.5"
                       style={{ color: mode === opt.value ? "rgba(165,180,252,0.9)" : "rgba(255,255,255,0.6)" }}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] leading-relaxed"
                       style={{ color: "rgba(255,255,255,0.3)" }}>
                      {opt.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 shrink-0 accent-violet-400"
            />
            <span className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              I understand this will modify the{" "}
              <strong style={{ color: "rgba(165,180,252,0.85)" }}>{mod.label}</strong>{" "}
              localStorage key. A backup of the current local data will be downloaded first.
              Supabase data will not be deleted or changed.
            </span>
          </label>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleRestore}
              disabled={!confirmed}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-30"
              style={{
                background: "rgba(52,211,153,0.12)",
                color: "rgba(52,211,153,0.9)",
                border: "1px solid rgba(52,211,153,0.22)",
              }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                <path d="M8 2v8M5 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 13h10" strokeLinecap="round" />
              </svg>
              Restore {mod.label}
            </button>
            <button
              onClick={() => setPhase("preview")}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-70"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "rgba(148,163,184,0.5)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Restoring ─────────────────────────────────────────────────────────────

  if (phase === "restoring") {
    return (
      <div
        className="rounded-2xl p-5 flex items-center gap-3"
        style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.12)" }}
      >
        <div className="w-4 h-4 rounded-full animate-pulse" style={{ background: "rgba(52,211,153,0.4)" }} />
        <span className="text-xs" style={{ color: "rgba(52,211,153,0.65)" }}>
          Restoring from Supabase… do not close this tab.
        </span>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────

  if (phase === "done" && result) {
    const hasErrors = result.errors.length > 0 || result.invalidRows > 0;

    return (
      <div className="space-y-3">
        <div
          className="rounded-2xl p-5"
          style={{
            background: hasErrors ? "rgba(245,158,11,0.05)" : "rgba(52,211,153,0.05)",
            border: hasErrors ? "1px solid rgba(245,158,11,0.15)" : "1px solid rgba(52,211,153,0.15)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full"
                  style={{ background: hasErrors ? "rgba(245,158,11,0.7)" : "rgba(52,211,153,0.85)" }} />
            <span className="text-sm font-semibold"
                  style={{ color: hasErrors ? "rgba(245,158,11,0.85)" : "rgba(52,211,153,0.9)" }}>
              {hasErrors ? "Restore Complete with Warnings" : "Restore Complete"}
            </span>
          </div>

          <div className="space-y-1 text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            <p>Module: <span style={{ color: "rgba(255,255,255,0.7)" }}>{result.label}</span></p>
            <p>Mode: <span style={{ color: "rgba(255,255,255,0.7)" }}>
              {result.mode === "merge_by_id" ? "Merge by ID" : "Replace local module"}
            </span></p>
            <p>Fetched from Supabase: <span style={{ color: "rgba(165,180,252,0.75)" }}>{result.fetchedFromSupabase}</span></p>
            <p>Valid rows: <span style={{ color: "rgba(52,211,153,0.75)" }}>{result.validRows}</span></p>
            {result.invalidRows > 0 && (
              <p>Invalid / skipped: <span style={{ color: "rgba(245,158,11,0.7)" }}>{result.invalidRows}</span></p>
            )}
            {result.mode === "merge_by_id" && (
              <>
                <p>New items added: <span style={{ color: "rgba(52,211,153,0.7)" }}>{result.itemsMergedNew}</span></p>
                <p>Items updated (Supabase newer): <span style={{ color: "rgba(165,180,252,0.7)" }}>{result.itemsMergedUpdated}</span></p>
                <p>Items kept (local newer): <span style={{ color: "rgba(255,255,255,0.4)" }}>{result.itemsMergedKept}</span></p>
              </>
            )}
            <p>Total items in localStorage now: <span style={{ color: "rgba(255,255,255,0.7)" }}>{result.itemsWritten}</span></p>
          </div>

          {result.errors.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {result.errors.map((e, i) => (
                <p key={i} className="text-[10px]" style={{ color: "rgba(245,158,11,0.65)" }}>{e}</p>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl text-xs font-semibold shrink-0"
            style={{
              background: "rgba(52,211,153,0.1)",
              color: "rgba(52,211,153,0.85)",
              border: "1px solid rgba(52,211,153,0.18)",
            }}
          >
            Reload App
          </button>
          <button onClick={handleReset} className="text-xs underline shrink-0" style={{ color: "rgba(148,163,184,0.4)" }}>
            Restore another module
          </button>
          <p className="text-[10px] flex-1" style={{ color: "rgba(255,255,255,0.18)" }}>
            Reload so the app reads the updated localStorage data.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
