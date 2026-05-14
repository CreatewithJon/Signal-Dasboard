import type { Metadata } from "next";
import DailyPlanCard from "@/components/planner/DailyPlanCard";
import WeeklyPlanCard from "@/components/planner/WeeklyPlanCard";
import MonthlyFocusCard from "@/components/planner/MonthlyFocusCard";
import LongTermVisionCard from "@/components/planner/LongTermVisionCard";
import ReviewCard from "@/components/planner/ReviewCard";
import AIPlannerPanel from "@/components/planner/AIPlannerPanel";
import ProjectedOutcomesCard from "@/components/planner/ProjectedOutcomesCard";

export const metadata: Metadata = {
  title: "Life Planner — Signal",
  description: "Connect long-term vision to daily execution.",
};

const DIVIDER = (
  <div
    style={{
      height: 1,
      background:
        "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.04) 80%, transparent 100%)",
    }}
  />
);

export default function PlannerPage() {
  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Page Header ── */}
      <section className="relative py-12 md:py-20 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 75% at 50% 35%, rgba(139,92,246,0.2) 0%, rgba(99,102,241,0.06) 55%, transparent 75%)",
          }}
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-violet-400/60 mb-5 relative">
          Life Planner
        </p>
        <h1
          className="text-4xl md:text-5xl font-bold tracking-[-0.02em] leading-[1.05] mb-5 relative"
          style={{
            background:
              "linear-gradient(165deg, rgba(255,255,255,0.97) 20%, rgba(255,255,255,0.5) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Vision to Execution.
        </h1>
        <p className="text-sm text-white/25 max-w-sm mx-auto leading-relaxed relative">
          Connect your 5-year vision to what you do today.
          Plan. Execute. Review. Repeat.
        </p>

        {/* Hierarchy pills */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap mt-8 relative">
          {["Vision", "Goals", "Monthly", "Weekly", "Daily", "Review"].map((label, i, arr) => (
            <div key={label} className="flex items-center gap-1.5">
              <span
                className="text-[9px] font-semibold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(139,92,246,0.08)",
                  border: "1px solid rgba(139,92,246,0.16)",
                  color: "rgba(167,139,250,0.7)",
                }}
              >
                {label}
              </span>
              {i < arr.length - 1 && (
                <span className="text-white/15 text-xs">→</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {DIVIDER}

      {/* ── Row 1: Daily + AI Planner ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 my-5">
        <div className="col-span-1 md:col-span-7 flex">
          <DailyPlanCard />
        </div>
        <div className="col-span-1 md:col-span-5 flex">
          <AIPlannerPanel />
        </div>
      </div>

      {/* ── Row 2: Weekly + Monthly ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-5">
        <div className="col-span-1 md:col-span-6 flex">
          <WeeklyPlanCard />
        </div>
        <div className="col-span-1 md:col-span-6 flex">
          <MonthlyFocusCard />
        </div>
      </div>

      {/* ── Long-Term Vision section ── */}
      <div className="mb-2 mt-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/20 mb-5">
          Long-Term Vision
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <LongTermVisionCard horizon="1yr" />
        <LongTermVisionCard horizon="3yr" />
        <LongTermVisionCard horizon="5yr" />
      </div>

      {/* ── Review & Reflection ── */}
      <div className="mb-2 mt-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/20 mb-5">
          Review &amp; Reflection
        </p>
      </div>
      <div className="mb-5">
        <ReviewCard />
      </div>

      {/* ── Projected Outcomes ── */}
      <div className="mb-2 mt-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/20 mb-5">
          Projected Outcomes
        </p>
      </div>
      <div className="mb-8">
        <ProjectedOutcomesCard />
      </div>
    </div>
  );
}
