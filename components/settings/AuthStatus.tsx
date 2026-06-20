"use client";

import { useEffect, useState } from "react";
import {
  getAuthStatus,
  sendMagicLink,
  signOut,
  type AuthStatus as AuthStatusType,
} from "@/lib/supabase/authStatus";

type SignInState = "idle" | "sending" | "sent" | "error";

export default function AuthStatus() {
  const [status, setStatus]         = useState<AuthStatusType | null>(null);
  const [email, setEmail]           = useState("");
  const [signInState, setSignInState] = useState<SignInState>("idle");
  const [errorMsg, setErrorMsg]     = useState("");

  // Load initial auth state and subscribe to changes
  useEffect(() => {
    let cancelled = false;
    getAuthStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => { cancelled = true; };
  }, []);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || signInState === "sending") return;
    setSignInState("sending");
    setErrorMsg("");
    const redirectTo = window.location.origin + "/settings";
    const result = await sendMagicLink(email.trim(), redirectTo);
    if (result.error) {
      setErrorMsg(result.error);
      setSignInState("error");
    } else {
      setSignInState("sent");
    }
  }

  async function handleSignOut() {
    const result = await signOut();
    if (!result.error) {
      setStatus((prev) => prev
        ? { ...prev, authenticated: false, userId: undefined, email: undefined, mode: "supabase-auth-ready" }
        : prev
      );
    }
  }

  if (!status) return null;

  // ── Mode: anonymous-local ─────────────────────────────────────────────────
  if (status.mode === "anonymous-local") {
    return (
      <div
        className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full" style={{ background: "rgba(148,163,184,0.4)" }} />
          <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
            Anonymous Local Mode
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
          Supabase is not configured. The app runs entirely in your browser using localStorage.
          All your data stays on this device. No account is needed.
        </p>
        <p className="text-[10px] mt-3" style={{ color: "rgba(255,255,255,0.2)" }}>
          To enable cloud sync and auth, add{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your environment.
        </p>
      </div>
    );
  }

  // ── Mode: authenticated ───────────────────────────────────────────────────
  if (status.mode === "authenticated") {
    return (
      <div
        className="rounded-2xl p-5"
        style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.15)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ background: "rgba(52,211,153,0.85)" }} />
              <span className="text-sm font-semibold" style={{ color: "rgba(52,211,153,0.9)" }}>
                Signed In
              </span>
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
              {status.email}
            </p>
            <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
              ID: <code>{status.userId?.slice(0, 8)}…</code>
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition-opacity hover:opacity-70"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            Sign Out
          </button>
        </div>
        <div
          className="mt-4 px-3 py-2.5 rounded-xl text-[10px] leading-relaxed"
          style={{ background: "rgba(52,211,153,0.06)", color: "rgba(52,211,153,0.65)" }}
        >
          Your Supabase writes include your user ID. localStorage is still the active
          source of truth — no data has been migrated.
        </div>
        <div
          className="mt-3 px-3 py-2.5 rounded-xl text-[10px] leading-relaxed flex items-start gap-2"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
        >
          <span style={{ color: "rgba(245,158,11,0.8)" }}>⚠</span>
          <span style={{ color: "rgba(245,158,11,0.75)" }}>
            <strong>RLS required before external beta.</strong> Row-Level Security is not yet active —
            any authenticated user on this Supabase project can read all rows.
            Run the v7.0 migration in <code>supabase/schema.sql</code> and
            see <code>docs/RLS_SECURITY_PLAN.md</code> before sharing with other users.
          </span>
        </div>
      </div>
    );
  }

  // ── Mode: supabase-auth-ready (configured, not signed in) ─────────────────
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ background: "rgba(245,158,11,0.7)" }} />
        <span className="text-sm font-semibold" style={{ color: "rgba(245,158,11,0.85)" }}>
          Supabase Auth Ready
        </span>
      </div>
      <p className="text-xs mb-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
        Supabase is configured but you are not signed in. The app works normally —
        Supabase writes use <code className="text-white/25">user_id = null</code> until
        you sign in.
      </p>
      <div
        className="mb-5 px-3 py-2.5 rounded-xl text-[10px] leading-relaxed flex items-start gap-2"
        style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)" }}
      >
        <span style={{ color: "rgba(245,158,11,0.7)" }}>⚠</span>
        <span style={{ color: "rgba(245,158,11,0.6)" }}>
          Rows written with <code>user_id = null</code> become inaccessible once RLS is
          enabled. Sign in first, then run the null-row migration in{" "}
          <code>docs/RLS_SECURITY_PLAN.md</code> before activating RLS.
        </span>
      </div>

      {/* Magic link sign-in form */}
      {signInState === "sent" ? (
        <div
          className="px-4 py-3 rounded-xl text-xs"
          style={{ background: "rgba(52,211,153,0.08)", color: "rgba(52,211,153,0.8)", border: "1px solid rgba(52,211,153,0.15)" }}
        >
          Magic link sent to <strong>{email}</strong>. Check your inbox and click the link
          to sign in — you will be redirected back to Settings.
        </div>
      ) : (
        <form onSubmit={handleSendLink} className="flex items-center gap-2">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-3 py-2.5 rounded-xl text-xs outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              color: "rgba(255,255,255,0.8)",
            }}
          />
          <button
            type="submit"
            disabled={signInState === "sending"}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-opacity disabled:opacity-40"
            style={{
              background: "rgba(99,102,241,0.2)",
              color: "rgba(165,180,252,0.9)",
              border: "1px solid rgba(99,102,241,0.3)",
            }}
          >
            {signInState === "sending" ? "Sending…" : "Send Magic Link"}
          </button>
        </form>
      )}

      {signInState === "error" && (
        <p className="mt-2 text-[10px]" style={{ color: "rgba(248,113,113,0.7)" }}>
          {errorMsg}
        </p>
      )}

      <p className="text-[10px] mt-4" style={{ color: "rgba(255,255,255,0.18)" }}>
        No password needed. We send a one-time link to your email. Signing in does
        not migrate or replace your existing local data.
      </p>
    </div>
  );
}
