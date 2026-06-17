import type { Metadata } from "next";
import { getSupabaseStatus } from "@/lib/supabase/status";
import StorageExport from "@/components/settings/StorageExport";
import MemorySyncStatus from "@/components/settings/MemorySyncStatus";
import SyncHealth from "@/components/settings/SyncHealth";
import AuthStatus from "@/components/settings/AuthStatus";

export const metadata: Metadata = {
  title: "Settings — Sovereign OS",
  description: "System settings and configuration.",
};

// ── Sub-components (server) ────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ background: ok ? "rgba(52,211,153,0.85)" : "rgba(239,68,68,0.7)" }}
    />
  );
}

function SettingRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-xs font-mono" style={{ color: muted ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.65)" }}>
        {value}
      </span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const supabase = getSupabaseStatus();
  const isReady  = supabase.mode === "supabase-ready";

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">

      {/* ── Header ── */}
      <div className="mb-10">
        <p
          className="text-[9px] font-bold uppercase tracking-[0.32em] mb-3"
          style={{ color: "rgba(99,102,241,0.55)" }}
        >
          Sovereign OS · Settings
        </p>
        <h1
          className="font-bold tracking-[-0.02em] leading-[1.1] mb-2"
          style={{
            fontSize: "clamp(22px, 4vw, 34px)",
            background: "linear-gradient(160deg, rgba(255,255,255,0.95) 20%, rgba(255,255,255,0.45) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          System Configuration
        </h1>
        <p className="text-xs text-white/30">
          Manage persistence, data, and environment configuration.
        </p>
      </div>

      {/* ── Persistence Mode ────────────────────────────────────────────── */}
      <section className="mb-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/25 mb-4">
          Persistence Mode
        </p>

        {/* Mode badge */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{
            background: isReady ? "rgba(52,211,153,0.04)" : "rgba(245,158,11,0.04)",
            border: isReady ? "1px solid rgba(52,211,153,0.15)" : "1px solid rgba(245,158,11,0.15)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <StatusDot ok={isReady} />
            <span
              className="text-sm font-semibold"
              style={{ color: isReady ? "rgba(52,211,153,0.9)" : "rgba(245,158,11,0.9)" }}
            >
              {isReady ? "Supabase Ready" : "Local Only"}
            </span>
          </div>
          <p className="text-xs text-white/35 leading-relaxed">
            {isReady
              ? "Supabase is configured. The system is ready for dual-write sync (v4.1). Data is currently still read from localStorage — Supabase writes will begin in the next phase."
              : "Running in localStorage-only mode. All data is stored in your browser. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment to enable Supabase persistence."}
          </p>
        </div>

        {/* Status detail rows */}
        <div
          className="rounded-2xl px-5 py-1"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <StatusDot ok={supabase.urlPresent} />
            <span className="text-xs text-white/40 flex-1">Supabase URL</span>
            <span className="text-xs font-mono" style={{ color: supabase.urlPresent ? "rgba(52,211,153,0.75)" : "rgba(255,255,255,0.18)" }}>
              {supabase.urlPresent ? "Detected" : "Not set"}
            </span>
          </div>
          <div className="flex items-center gap-2 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <StatusDot ok={supabase.anonKeyPresent} />
            <span className="text-xs text-white/40 flex-1">Supabase Anon Key</span>
            <span className="text-xs font-mono" style={{ color: supabase.anonKeyPresent ? "rgba(52,211,153,0.75)" : "rgba(255,255,255,0.18)" }}>
              {supabase.anonKeyPresent ? "Detected" : "Not set"}
            </span>
          </div>
          <div className="flex items-center gap-2 py-3">
            <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: "rgba(99,102,241,0.7)" }} />
            <span className="text-xs text-white/40 flex-1">Active source of truth</span>
            <span className="text-xs font-mono text-white/35">localStorage</span>
          </div>
        </div>

        {/* Warning */}
        {!isReady && (
          <div
            className="mt-3 rounded-xl px-4 py-3 flex items-start gap-2"
            style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)" }}
          >
            <span className="text-xs text-amber-400/70 mt-0.5">⚠</span>
            <p className="text-[11px] text-white/35 leading-relaxed">
              localStorage data is browser-local and not backed up. Use the export button below to save a manual backup. Add Supabase env vars to enable cloud persistence.
            </p>
          </div>
        )}

        {/* Setup steps when not configured */}
        {!isReady && (
          <div
            className="mt-4 rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25 mb-3">
              To enable Supabase
            </p>
            <ol className="space-y-2">
              {[
                "Create a project at supabase.com/dashboard",
                "Copy your Project URL and anon public key",
                "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Vercel env",
                "Run supabase/schema.sql in the Supabase SQL Editor",
                "Redeploy — this page will show Supabase Ready",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold mt-0.5"
                    style={{ background: "rgba(99,102,241,0.12)", color: "rgba(165,180,252,0.7)" }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-xs text-white/35 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* ── Auth Status ─────────────────────────────────────────────────── */}
      <section className="mb-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/25 mb-4">
          Identity & Auth
        </p>
        <AuthStatus />
        <p className="text-[10px] text-white/20 mt-2 px-1">
          localStorage is still the active source of truth. Auth is optional and does not
          migrate or replace local data. Signing in stamps your user ID on future Supabase
          writes only — nothing else changes.
        </p>
      </section>

      {/* ── Sync Roadmap ────────────────────────────────────────────────── */}
      <section className="mb-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/25 mb-4">
          Sync Roadmap
        </p>
        <div
          className="rounded-2xl px-5 py-1"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {[
            { version: "v4.0", label: "Foundation", desc: "Supabase client, schema, status", done: true },
            { version: "v4.1", label: "Dual Write — Memory", desc: "Memory writes go to localStorage + Supabase in parallel", done: true },
            { version: "v4.2", label: "Dual Write — All Modules", desc: "Projects, tasks, content, focus sessions — dual-write enabled", done: true },
            { version: "v4.3", label: "Sync Health + Restore", desc: "Per-module sync status panel, last-write tracking, manual backup restore", done: true },
            { version: "v4.4", label: "Auth Readiness", desc: "Optional sign-in via magic link; user_id stamped on writes; app stays fully local — current", done: true },
            { version: "v4.5", label: "Auth + Migration", desc: "Migrate localStorage data to Supabase under user_id; /api/migrate endpoint", done: false },
            { version: "v4.6", label: "RLS", desc: "Row-level security; data private by default", done: false },
            { version: "v4.7", label: "Read Shift", desc: "Reads from Supabase; localStorage becomes write-through cache", done: false },
          ].map((phase, i, arr) => (
            <div
              key={phase.version}
              className="flex items-start gap-4 py-3"
              style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
            >
              <span
                className="text-[9px] font-bold font-mono shrink-0 mt-0.5 w-8"
                style={{ color: phase.done ? "rgba(52,211,153,0.7)" : "rgba(255,255,255,0.2)" }}
              >
                {phase.version}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: phase.done ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.3)" }}>
                  {phase.label}
                  {phase.version === "v4.4" && phase.done && <span className="ml-2 text-[8px] text-emerald-400/60">● Current</span>}
                </p>
                <p className="text-[10px] text-white/25 mt-0.5 leading-relaxed">{phase.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sync Coverage ────────────────────────────────────────────────── */}
      <section className="mb-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/25 mb-4">
          Sync Coverage
        </p>
        <div
          className="rounded-2xl px-5 py-1"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {[
            { label: "Memory",         covered: true,  desc: "Capture, edit, delete — dual-write since v4.1" },
            { label: "Projects",       covered: true,  desc: "Create, update, archive — dual-write since v4.2" },
            { label: "Project Tasks",  covered: true,  desc: "Create, update, delete — dual-write since v4.2" },
            { label: "Content Items",  covered: true,  desc: "Create, update, archive — dual-write since v4.2" },
            { label: "Focus Sessions", covered: true,  desc: "Start, complete, abandon — dual-write since v4.2" },
            { label: "Planner",        covered: false, desc: "Local only — planned for v4.3" },
            { label: "Habits",         covered: false, desc: "Local only — planned for v4.3" },
          ].map((row, i, arr) => (
            <div
              key={row.label}
              className="flex items-center gap-3 py-3"
              style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: row.covered ? "rgba(52,211,153,0.85)" : "rgba(255,255,255,0.15)" }}
              />
              <span
                className="text-xs font-semibold w-32 shrink-0"
                style={{ color: row.covered ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.25)" }}
              >
                {row.label}
              </span>
              <span className="text-[10px] text-white/20 flex-1">{row.desc}</span>
              <span
                className="text-[9px] font-bold shrink-0"
                style={{ color: row.covered ? "rgba(52,211,153,0.7)" : "rgba(255,255,255,0.15)" }}
              >
                {row.covered ? (isReady ? "Syncing" : "Ready") : "Local only"}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-white/20 mt-2 px-1">
          All modules write to localStorage first. Supabase writes happen in the background when configured.
        </p>
      </section>

      {/* ── Sync Health ─────────────────────────────────────────────────── */}
      <section className="mb-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/25 mb-4">
          Sync Health
        </p>
        <SyncHealth />
      </section>

      {/* ── Memory Sync ─────────────────────────────────────────────────── */}
      <section className="mb-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/25 mb-4">
          Memory Store
        </p>
        <div
          className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <MemorySyncStatus />
          <p className="text-[10px] text-white/20 mt-3 leading-relaxed">
            Memory items are saved to localStorage first, then synced to Supabase in the background when configured. Reads still come from localStorage.
          </p>
        </div>
      </section>

      {/* ── Data & Storage ──────────────────────────────────────────────── */}
      <section className="mb-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/25 mb-4">
          Data & Storage
        </p>
        <div
          className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-xs text-white/40 mb-4 leading-relaxed">
            Export all your Sovereign OS data as a JSON backup, or restore from a previous backup. Includes projects, tasks, memory, content, planner, habits, and focus sessions.
          </p>
          {/* Client component handles the export */}
          <StorageExport />
        </div>
      </section>

      {/* ── System Info ─────────────────────────────────────────────────── */}
      <section className="mb-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/25 mb-4">
          System
        </p>
        <div
          className="rounded-2xl px-5 py-1"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <SettingRow label="Version" value="Sovereign OS v4.4" />
          <SettingRow label="Persistence" value={supabase.mode === "supabase-ready" ? "Supabase + localStorage" : "localStorage only"} />
          <SettingRow label="AI Model" value="Claude Haiku 4.5" />
          <SettingRow label="Deployment" value="Vercel (auto-deploy from main)" />
          <SettingRow label="Schema version" value="supabase/schema.sql v4.0" muted />
        </div>
      </section>

      {/* ── Planned Settings ────────────────────────────────────────────── */}
      <section>
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/25 mb-4">
          Coming Soon
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "API Key Manager", desc: "View which keys are active: Anthropic, YouTube, OpenAI" },
            { label: "Dashboard Password", desc: "Update your Sovereign OS access password in-app" },
            { label: "Theme Customization", desc: "Accent colors, density, and motion preferences" },
            { label: "Module Toggles", desc: "Enable or disable individual OS modules" },
            { label: "Usage Stats", desc: "API calls, tokens used, session count history" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <p className="text-xs font-semibold text-white/40 mb-1">{s.label}</p>
              <p className="text-[10px] text-white/20 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-8" />
    </div>
  );
}
