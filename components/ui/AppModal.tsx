"use client";

/**
 * components/ui/AppModal.tsx
 *
 * Reusable modal shell — Sovereign OS v6.5
 *
 * Handles: backdrop overlay, Escape-to-close, click-outside-to-close,
 * max-h-[90vh] enforcement, rounded container, iOS safe-area bottom padding
 * for bottom-sheet alignment on iPhone.
 *
 * Usage — wrap any modal content:
 *   <AppModal open={isOpen} onClose={() => setOpen(false)} maxWidth="lg">
 *     {/* sticky header (shrink-0), scrollable body (flex-1 overflow-y-auto),
 *          sticky footer (shrink-0) all go here *\/}
 *   </AppModal>
 *
 * The inner container is `flex flex-col overflow-hidden` so that children
 * using the shrink-0 / flex-1 pattern get proper sticky header + scroll body.
 */

import { useEffect, type ReactNode } from "react";

export interface AppModalProps {
  open:          boolean;
  onClose:       () => void;
  children:      ReactNode;
  /** Modal panel max-width. Default: "lg" */
  maxWidth?:     "sm" | "md" | "lg" | "xl" | "2xl";
  /**
   * Vertical alignment of the panel within the overlay.
   * - "center" — vertically centred (default)
   * - "bottom" — anchored to bottom on mobile, centred on ≥sm
   * - "top"    — anchored near top with generous top padding
   */
  align?:        "center" | "bottom" | "top";
  /** Border color. Default: indigo tone */
  accentBorder?: string;
  /** Box-shadow. Default: dark depth + subtle indigo glow */
  accentShadow?: string;
  /** Panel background. Default: near-black */
  background?:   string;
  /** Corner radius. Default: "2xl" */
  rounded?:      "2xl" | "3xl";
  /** Accessible label for the dialog element */
  "aria-label"?: string;
}

const MAX_W: Record<string, string> = {
  sm:    "max-w-sm",
  md:    "max-w-md",
  lg:    "max-w-lg",
  xl:    "max-w-xl",
  "2xl": "max-w-2xl",
};

export default function AppModal({
  open,
  onClose,
  children,
  maxWidth     = "lg",
  align        = "center",
  accentBorder = "rgba(99,102,241,0.2)",
  accentShadow = "0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(99,102,241,0.06)",
  background   = "rgba(10,10,20,0.98)",
  rounded      = "2xl",
  "aria-label": ariaLabel,
}: AppModalProps) {
  // Escape key — close the modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const mw = MAX_W[maxWidth] ?? MAX_W.lg;
  const rd = rounded === "3xl" ? "rounded-3xl" : "rounded-2xl";

  // Outer flex alignment classes + padding
  const alignCls = align === "bottom"
    ? "items-end sm:items-center"
    : align === "top"
    ? "items-start"
    : "items-center";

  const outerPad = align === "top" ? "px-4 pt-12 pb-4" : "p-4";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className={`fixed inset-0 z-50 flex ${alignCls} justify-center ${outerPad}`}
      style={{
        background:           "rgba(0,0,0,0.75)",
        backdropFilter:       "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`w-full ${mw} flex flex-col ${rd} max-h-[90vh] overflow-hidden`}
        style={{
          background,
          border:        `1px solid ${accentBorder}`,
          boxShadow:     accentShadow,
          // iOS home-indicator safe zone when used as a bottom sheet
          paddingBottom: align === "bottom" ? "env(safe-area-inset-bottom)" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
