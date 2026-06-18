"use client";

/**
 * components/settings/ReadModeSettings.tsx
 *
 * Read Mode Settings — Sovereign OS v4.8
 *
 * Module-by-module toggle between localStorage ("local") and Supabase ("supabase")
 * as the read source. All modules default to "local". Switching to Supabase
 * requires explicit confirmation. Switching back to local is immediate.
 *
 * Safety:
 *   - Supabase read requires active auth — repositories fall back silently.
 *   - Confirmation checkbox required before switching any module to Supabase.
 *   - Reset All button reverts all modules to local immediately.
 *   - localStorage is never deleted or overwritten during reads.
 */

import { useState, useEffect } from "react";
import {
  getReadModeConfig,
  setReadMode,
  resetReadModeToLocal,
  type ReadModeModule,
  type ReadModeConfig,
  type ReadModeValue,
} from "@/lib/supabase/readMode";
import { getCachedUserId } from "@/lib/supabase/authStatus";
import { getSupabaseStatus } from "@/lib/supabase/status";

// ── Module metadata ────────────────────────────────────────────────────────

interface ModuleMeta {
  key:    ReadModeModule;
  label:  string;
  table:  string;
  wired:  boolean; // true = UI has been updated to use the repo read method
}

const MODULES: ModuleMeta[] = [
  { key: "memory",        label: "Memory",         table: "memory_items",   wired: true  },
  { key: "projects",      label: "Projects",       table: "projects",       wired: false },
  { key: "projectTasks",  label: "Project Tasks",  table: "project_tasks",  wired: false },
  { key: "content",       label: "Content",        table: "content_items",  wired: false },
  { key: "focusSessions", label: "Focus Sessions", table: "focus_sessions", wired: false },
];

const EMPTY_CONFIG: ReadModeConfig = {
  memory: "local", projects: "local", projectTasks: "local",
  content: "local", focusSessions: "local",
};

const CONFIRM_TEXT =
  "I understand Supabase will be used as the read source for this module " +
  "and localStorage remains the fallback.";

// ── Component ──────────────────────────────────────────────────────────────

type PendingChange = { module: ReadModeModule } | null;

export default function ReadModeSettings() {
  const [config,       setConfig]       = useState<ReadModeConfig>(EMPTY_CONFIG);
  const [pending,      setPending]      = useState<PendingChange>(null);
  const [confirmed,    setConfirmed]    = useState(false);
  const [resetPhase,   setResetPhase]   = useState(false);
  const [isAuth,       setIsAuth]       = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    setConfig(getReadModeConfig());
    setIsAuth(getCachedUserId() !== null);
    setIsConfigured(getSupabaseStatus().configured);
  }, []);

  const anySupabase = Object.values(config).some((v) => v === "supabase");

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleToggle(module: ReadModeModule, targetMode: ReadModeValue) {
    if (targetMode === "local") {
      // Immediate — no confirmation needed
      setReadMode(module, "local");
      setConfig((prev) => ({ ...prev, [module]: "local" }));
      if (pending?.module === module) { setPending(null); setConfirmed(false); }
    } else {
      // Switching to Supabase — show inline confirmation
      setPending({ module });
      setConfirmed(false);
      setResetPhase(false);
    }
  }

  function applyPending() {
    if (!pending || !confirmed) return;
    setReadMode(pending.module, "supabase");
    setConfig((prev) => ({ ...prev, [pending.module]: "supabase" }));
    setPending(null);
    setConfirmed(false);
  }

  function cancelPending() {
    setPending(null);
    setConfirmed(false);
  }

  function handleReset() {
    if (!resetPhase) { setResetPhase(true); return; }
    resetReadModeToLocal();
    setConfig({ ...EMPTY_CONFIG });
    setResetPhase(false);
    setPending(null);
    setConfirmed(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)" }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-white/70">Read Source</p>
            <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">
              Choose where each module reads its data. All modules default to localStorage.
            </p>
          </div>
          {anySupabase && (
            <button
              onClick={handleReset}
              className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all shrink-0 mt-0.5"
              style={{
                background: resetPhase ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                border: resetPhase
                  ? "1px solid rgba(239,68,68,0.2)"
                  : "1px solid rgba(255,255,255,0.08)",
                color: resetPhase ? "rgba(239,68,68,0.8)" : "rgba(255,255,255,0.3)",
              }}
            >
              {resetPhase ? "Confirm reset" : "Reset all to Local"}
            </button>
          )}
        </div>

        {/* Warnings */}
        {!isConfigured && (
          <div
            className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg"
            style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)" }}
          >
            <span className="text-xs text-amber-400/60 mt-px shrink-0">⚠</span>
            <p className="text-[10px] text-white/35 leading-relaxed">
              Supabase is not configured. Supabase read mode will fall back to local for all modules.
            </p>
          </div>
        )}
        {isConfigured && !isAuth && (
          <div
            className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg"
            style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)" }}
          >
            <span className="text-xs text-amber-400/60 mt-px shrink-0">⚠</span>
            <p className="text-[10px] text-white/35 leading-relaxed">
              Not signed in. Supabase read will fall back to localStorage until you authenticate via Identity & Auth above.
            </p>
          </div>
        )}
      </div>

      {/* Module rows */}
      {MODULES.map((mod, i) => {
        const currentMode = config[mod.key];
        const isLocal     = currentMode === "local";
        const isPending   = pending?.module === mod.key;
        const isLast      = i === MODULES.length - 1;

        return (
          <div
            key={mod.key}
            style={{ borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)" }}
          >
            {/* Row */}
            <div className="px-5 py-3.5 flex items-center gap-4">
              {/* Label + badges */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-white/65">{mod.label}</p>
                  {!mod.wired && (
                    <span
                      className="text-[8px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full shrink-0"
                      style={{
                        background: "rgba(99,102,241,0.07)",
                        border: "1px solid rgba(99,102,241,0.15)",
                        color: "rgba(165,180,252,0.5)",
                      }}
                    >
                      UI pending
                    </span>
                  )}
                  {mod.wired && !isLocal && (
                    <span
                      className="text-[8px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full shrink-0"
                      style={{
                        background: "rgba(52,211,153,0.07)",
                        border: "1px solid rgba(52,211,153,0.18)",
                        color: "rgba(52,211,153,0.65)",
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white/25 mt-0.5">
                  {mod.wired
                    ? isLocal
                      ? "Reading from localStorage"
                      : `Reading from ${mod.table}`
                    : isLocal
                      ? "Config ready — UI wiring in next phase"
                      : `Config set — UI wiring in next phase`}
                </p>
              </div>

              {/* Segmented toggle */}
              <div
                className="flex items-center rounded-lg overflow-hidden shrink-0"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {(["local", "supabase"] as ReadModeValue[]).map((mode) => {
                  const active    = currentMode === mode;
                  const isSupaBtn = mode === "supabase";
                  return (
                    <button
                      key={mode}
                      disabled={active}
                      onClick={() => handleToggle(mod.key, mode)}
                      className="text-[10px] font-semibold px-3 py-1.5 transition-all disabled:cursor-default"
                      style={{
                        background: active
                          ? isSupaBtn
                            ? "rgba(99,102,241,0.14)"
                            : "rgba(52,211,153,0.1)"
                          : "transparent",
                        color: active
                          ? isSupaBtn
                            ? "rgba(165,180,252,0.9)"
                            : "rgba(52,211,153,0.85)"
                          : "rgba(255,255,255,0.2)",
                        borderRight: mode === "local" ? "1px solid rgba(255,255,255,0.08)" : "none",
                      }}
                    >
                      {isSupaBtn ? "Supabase" : "Local"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inline confirmation (only for the pending module) */}
            {isPending && (
              <div
                className="mx-5 mb-4 rounded-xl p-4"
                style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.18)" }}
              >
                <label className="flex items-start gap-3 cursor-pointer mb-3">
                  <div
                    className="w-4 h-4 rounded-md border shrink-0 mt-0.5 flex items-center justify-center transition-all"
                    style={{
                      background: confirmed ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.04)",
                      borderColor: confirmed ? "rgba(99,102,241,0.9)" : "rgba(255,255,255,0.15)",
                    }}
                    onClick={() => setConfirmed((v) => !v)}
                  >
                    {confirmed && (
                      <svg viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="1.5" className="w-2 h-2">
                        <path d="M1 4l2 2 4-3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <p
                    className="text-[10px] text-white/40 leading-relaxed select-none"
                    onClick={() => setConfirmed((v) => !v)}
                  >
                    {CONFIRM_TEXT}
                  </p>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={applyPending}
                    disabled={!confirmed}
                    className="text-[10px] font-bold px-4 py-1.5 rounded-lg transition-all disabled:opacity-30"
                    style={{
                      background: "rgba(99,102,241,0.12)",
                      border: "1px solid rgba(99,102,241,0.25)",
                      color: "rgba(165,180,252,0.9)",
                    }}
                  >
                    Switch to Supabase
                  </button>
                  <button
                    onClick={cancelPending}
                    className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Footer */}
      <div
        className="px-5 py-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <p className="text-[10px] text-white/20 leading-relaxed">
          Config stored in <span className="font-mono">sovereign_read_mode_config</span>.
          Switching to Supabase requires an active session.
          localStorage is always the fallback — never deleted or overwritten during reads.
        </p>
      </div>
    </div>
  );
}
