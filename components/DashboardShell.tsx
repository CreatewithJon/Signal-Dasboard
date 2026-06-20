"use client";

/**
 * components/DashboardShell.tsx
 *
 * Executive Dashboard Shell — Sovereign OS v6.3
 *
 * Reorganises the Command Center into clear executive zones:
 *   Executive Layer  — Chief · Strategy · Goals · Review
 *   Execution Layer  — Actions · Briefing · Focus
 *   Operating Layer  — Projects · Content · Relationships · Memory
 *   Signal Layer     — Bitcoin · BTC Stack · Productivity · Habits
 *
 * Each zone is collapsible. Signal Layer collapses on mobile.
 * "Today's Command" hero sits above the zones.
 */

import WelcomeBanner from "@/components/WelcomeBanner";
import TodayCommand from "@/components/TodayCommand";
import CollapsibleZone from "@/components/CollapsibleZone";
import ChiefOfStaffCard from "@/components/ChiefOfStaffCard";
import StrategicPlannerCard from "@/components/StrategicPlannerCard";
import GoalsCard from "@/components/GoalsCard";
import WeeklyReviewCard from "@/components/WeeklyReviewCard";
import ActionEngineCard from "@/components/ActionEngineCard";
import DailyBriefingCard from "@/components/DailyBriefingCard";
import FocusEngineCard from "@/components/FocusEngineCard";
import DailyRhythmCard from "@/components/DailyRhythmCard";
import ProjectsWidget from "@/components/ProjectsWidget";
import ContentWidget from "@/components/ContentWidget";
import RelationshipWidget from "@/components/RelationshipWidget";
import MemoryWidget from "@/components/MemoryWidget";
import BitcoinPanel from "@/components/BitcoinPanel";
import BTCStackPanel from "@/components/BTCStackPanel";
import ProductivityPanel from "@/components/ProductivityPanel";
import HabitPanel from "@/components/HabitPanel";
import AIPanel from "@/components/AIPanel";
import OverdueDigest from "@/components/OverdueDigest";
import SystemStatus from "@/components/SystemStatus";
import HeroStats from "@/components/HeroStats";
import SystemHealthCard from "@/components/SystemHealthCard";
import RevenueCard from "@/components/RevenueCard";

interface DashboardShellProps {
  btcPrice:       number;
  btcChange:      number;
  hasAIKey:       boolean;
  marketDataLive: boolean;
}

export default function DashboardShell({
  btcPrice,
  btcChange,
  hasAIKey,
  marketDataLive,
}: DashboardShellProps) {
  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="pt-8 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p
              className="text-[9px] font-bold uppercase tracking-[0.35em] mb-1"
              style={{ color: "rgba(139,92,246,0.55)" }}
            >
              Sovereign OS
            </p>
            <h1
              className="font-bold tracking-tight leading-none"
              style={{
                fontSize: "clamp(20px, 3vw, 28px)",
                background: "linear-gradient(165deg, rgba(255,255,255,0.95) 20%, rgba(255,255,255,0.45) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Command Center
            </h1>
          </div>
          <div className="shrink-0">
            <HeroStats btcPrice={btcPrice} btcChange={btcChange} />
          </div>
        </div>
      </div>

      {/* System status — thin row */}
      <div className="mb-6">
        <SystemStatus hasAIKey={hasAIKey} marketDataLive={marketDataLive} />
      </div>

      {/* ── Welcome Banner (first-run only) ────────────────────────── */}
      <WelcomeBanner />

      {/* ── Today's Command Hero ────────────────────────────────────── */}
      <TodayCommand />

      {/* ── Executive Layer ────────────────────────────────────────── */}
      <CollapsibleZone
        id="executive"
        label="Executive"
        accent="rgba(139,92,246,0.65)"
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ChiefOfStaffCard />
          <StrategicPlannerCard />
          <GoalsCard />
          <WeeklyReviewCard />
          <SystemHealthCard />
          <RevenueCard />
        </div>
      </CollapsibleZone>

      {/* ── Execution Layer ────────────────────────────────────────── */}
      <CollapsibleZone
        id="execution"
        label="Execution"
        accent="rgba(245,158,11,0.65)"
        defaultOpen={true}
      >
        <div className="space-y-4">
          <ActionEngineCard />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DailyBriefingCard />
            <FocusEngineCard />
          </div>
          <DailyRhythmCard />
        </div>
      </CollapsibleZone>

      {/* ── Operating Layer ────────────────────────────────────────── */}
      <CollapsibleZone
        id="operating"
        label="Operating"
        accent="rgba(99,102,241,0.65)"
        defaultOpen={true}
        extra={<OverdueDigest />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProjectsWidget />
            <ContentWidget />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RelationshipWidget />
            <MemoryWidget />
          </div>
        </div>
      </CollapsibleZone>

      {/* ── Signal Layer ───────────────────────────────────────────── */}
      <CollapsibleZone
        id="signal"
        label="Signals"
        accent="rgba(245,158,11,0.65)"
        defaultOpen={true}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="col-span-1 md:col-span-7 flex">
              <BitcoinPanel />
            </div>
            <div className="col-span-1 md:col-span-5 flex">
              <BTCStackPanel initialPrice={btcPrice} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="col-span-1 md:col-span-7 flex">
              <ProductivityPanel />
            </div>
            <div className="col-span-1 md:col-span-5 flex">
              <HabitPanel />
            </div>
          </div>
        </div>
      </CollapsibleZone>

      {/* ── AI Panel ───────────────────────────────────────────────── */}
      <CollapsibleZone
        id="ai"
        label="AI"
        accent="rgba(99,102,241,0.65)"
        defaultOpen={true}
      >
        <AIPanel />
      </CollapsibleZone>

      {/* Bottom breathing room */}
      <div className="h-16" />
    </div>
  );
}
