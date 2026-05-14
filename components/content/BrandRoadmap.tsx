"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "signal_brand_roadmap_v1";

interface Step {
  id: string;
  task: string;
  platform: "linkedin" | "x" | "youtube" | "all";
  tip?: string;
}

interface Phase {
  id: string;
  title: string;
  subtitle: string;
  timeframe: string;
  color: string;
  glow: string;
  border: string;
  steps: Step[];
}

const PHASES: Phase[] = [
  {
    id: "phase1",
    title: "Phase 1",
    subtitle: "Profile Foundation",
    timeframe: "Week 1",
    color: "rgba(59,130,246,0.9)",
    glow: "rgba(59,130,246,0.15)",
    border: "rgba(59,130,246,0.2)",
    steps: [
      { id: "p1-1", task: "Take a professional profile photo", platform: "all", tip: "Dark background, direct eye contact, clean clothing. No rented cars. No fake luxury." },
      { id: "p1-2", task: "Update LinkedIn headline to reflect your positioning", platform: "linkedin", tip: "Building AI systems that help businesses grow | Founder @ Digital Wealth Transfer | AI · Bitcoin · Automation" },
      { id: "p1-3", task: "Write and publish LinkedIn About section", platform: "linkedin", tip: "Use the Draft tool → LinkedIn About Section. Start with your East LA story. End with a DM CTA." },
      { id: "p1-4", task: "Update X/Twitter bio to match brand positioning", platform: "x", tip: "AI builder from East LA | Helping people leverage technology for freedom | Building @DigitalWealthXFR | Bitcoin. Automation." },
      { id: "p1-5", task: "Set up YouTube channel — name, description, category", platform: "youtube", tip: "Channel name: Jonathan Cardona. Category: Education. Description: use the Draft tool → YouTube Description." },
      { id: "p1-6", task: "Design banner images (consistent aesthetic across all platforms)", platform: "all", tip: "Dark background. One-line positioning statement. Your name. Subtle DWT branding. No clutter." },
      { id: "p1-7", task: "Add DWT website link to all platform bios", platform: "all", tip: "digitalwealthtransfer.com — primary link everywhere." },
      { id: "p1-8", task: "Ensure username is consistent: @jonathancardona", platform: "all", tip: "Same handle everywhere possible. Full name = clean authority signal." },
    ],
  },
  {
    id: "phase2",
    title: "Phase 2",
    subtitle: "Content Infrastructure",
    timeframe: "Week 2",
    color: "rgba(139,92,246,0.9)",
    glow: "rgba(139,92,246,0.15)",
    border: "rgba(139,92,246,0.2)",
    steps: [
      { id: "p2-1", task: "Write your origin story post for LinkedIn", platform: "linkedin", tip: "East LA → banking → Tesla → AI builder. Be honest. Be real. This is your most important post." },
      { id: "p2-2", task: "Write and publish X/Twitter origin story thread — pin it", platform: "x", tip: "8–12 tweets. Full arc. End with what you're building and why. Use the Draft tool." },
      { id: "p2-3", task: "Record YouTube channel trailer (90 seconds)", platform: "youtube", tip: "Who you are, why you're different, what they'll learn. Keep it under 2 minutes. Be direct." },
      { id: "p2-4", task: "Upload trailer and set it as YouTube featured video", platform: "youtube", tip: "Go to YouTube Studio → Customization → Layout → Featured video for new visitors." },
      { id: "p2-5", task: "Create a weekly posting schedule and commit to it", platform: "all", tip: "LinkedIn: 3–4x/week. X: 2–3x/day. YouTube: 1x/week. Consistency > perfection." },
      { id: "p2-6", task: "Set up a basic video recording setup", platform: "youtube", tip: "Clean background. Good lighting (ring light or window light). Decent mic. You don't need to spend $1,000." },
      { id: "p2-7", task: "Create content templates for your 3 main pillars", platform: "all", tip: "AI tutorials, Bitcoin education, Building in public. One template per pillar so creation feels easier." },
    ],
  },
  {
    id: "phase3",
    title: "Phase 3",
    subtitle: "First Content Sprint",
    timeframe: "Weeks 3–4",
    color: "rgba(239,68,68,0.9)",
    glow: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.2)",
    steps: [
      { id: "p3-1", task: "Publish first YouTube video (AI system tutorial — full walkthrough)", platform: "youtube", tip: "Lead with the outcome: 'A local business was missing 40% of leads. I fixed it in 3 hours. Here's how.'" },
      { id: "p3-2", task: "Post first LinkedIn content piece (not just the About section)", platform: "linkedin", tip: "Write a breakdown post: 'The #1 reason local businesses miss leads — and the 10-minute fix.'" },
      { id: "p3-3", task: "Post on X every day for 7 consecutive days", platform: "x", tip: "Mix: 1 insight post, 1 process/build post, 1 personal post. Engage with replies every day." },
      { id: "p3-4", task: "Engage in 5 Bitcoin and AI communities on X daily", platform: "x", tip: "Reply to big accounts with genuine, thoughtful responses. This is the fastest growth lever on X." },
      { id: "p3-5", task: "Comment on 10 LinkedIn posts from your target audience", platform: "linkedin", tip: "Business owners, consultants, marketers. Add real value in comments — not 'Great post!'" },
      { id: "p3-6", task: "Publish 3 more YouTube videos (Week 4)", platform: "youtube", tip: "Aim for: 1 tutorial, 1 education (Bitcoin or AI explained), 1 building-in-public update." },
      { id: "p3-7", task: "Share each YouTube video on LinkedIn and X with a native hook", platform: "all", tip: "Don't just drop a link. Write a native post first, then add the video link. Algorithms favor native content." },
      { id: "p3-8", task: "Ask 5 people you know to subscribe and leave an honest review", platform: "youtube", tip: "Your first 100 subscribers matter for credibility. Don't be too proud to ask people you know." },
    ],
  },
  {
    id: "phase4",
    title: "Phase 4",
    subtitle: "Build Momentum",
    timeframe: "Month 2+",
    color: "rgba(245,158,11,0.9)",
    glow: "rgba(245,158,11,0.15)",
    border: "rgba(245,158,11,0.2)",
    steps: [
      { id: "p4-1", task: "Hit 10 YouTube videos published", platform: "youtube", tip: "The algorithm starts paying attention around video 10–15. Don't stop before it starts working." },
      { id: "p4-2", task: "Repurpose each YouTube video into LinkedIn + X content", platform: "all", tip: "1 video = 1 LinkedIn post + 1 X thread + 1 short clip. One piece of content, 3 platforms." },
      { id: "p4-3", task: "Build to consistent 3–4 LinkedIn posts per week", platform: "linkedin", tip: "Rotate pillars: AI tutorial, personal story, contrarian take, resource share." },
      { id: "p4-4", task: "Build to 2–3 X posts per day consistently", platform: "x", tip: "Batch write on Sunday. Schedule for the week. Stay consistent even when engagement is low early on." },
      { id: "p4-5", task: "Add an email capture to digitalwealthtransfer.com", platform: "all", tip: "An email list is the only audience you truly own. Start building it from day one." },
      { id: "p4-6", task: "Reach out to 3 potential collaboration or podcast partners", platform: "all", tip: "Find builders in the AI/Bitcoin space at a similar stage. DM them genuinely. Collaboration > competition." },
      { id: "p4-7", task: "Create a YouTube Shorts or X video clip from a long-form video", platform: "youtube", tip: "60-second clips from your best moments. Shorts can dramatically accelerate YouTube growth." },
      { id: "p4-8", task: "Document one real client result as a case study (video + LinkedIn post)", platform: "all", tip: "This is your most powerful content. Real results > any tutorial. Even one case study changes everything." },
    ],
  },
];

const PLATFORM_COLORS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  linkedin: { label: "LinkedIn", color: "rgba(147,197,253,0.9)", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)" },
  x: { label: "X / Twitter", color: "rgba(255,255,255,0.6)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" },
  youtube: { label: "YouTube", color: "rgba(252,165,165,0.9)", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
  all: { label: "All Platforms", color: "rgba(167,243,208,0.9)", bg: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.15)" },
};

export default function BrandRoadmap() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["phase1"]));

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCompleted(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  function toggle(id: string) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  function togglePhase(phaseId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  }

  const totalSteps = PHASES.reduce((sum, p) => sum + p.steps.length, 0);
  const totalCompleted = completed.size;
  const overallPct = Math.round((totalCompleted / totalSteps) * 100);

  return (
    <div className="flex flex-col gap-6">

      {/* Overall progress */}
      <div
        className="p-5 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30 mb-1">Brand Build Progress</p>
            <p className="text-white font-bold text-lg">{totalCompleted} / {totalSteps} steps complete</p>
          </div>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <span className="text-amber-400 font-black text-sm">{overallPct}%</span>
          </div>
        </div>
        <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: `${overallPct}%`,
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #f59e0b)",
            }}
          />
        </div>
        <p className="text-white/20 text-xs mt-3 leading-relaxed">
          Your personal brand is the most valuable asset you&apos;re building. Treat each step like shipping code — do it, check it off, move forward.
        </p>
      </div>

      {/* Phases */}
      {PHASES.map((phase) => {
        const phaseCompleted = phase.steps.filter((s) => completed.has(s.id)).length;
        const phasePct = Math.round((phaseCompleted / phase.steps.length) * 100);
        const isOpen = expanded.has(phase.id);

        return (
          <div
            key={phase.id}
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${phase.border}`, background: `${phase.glow}` }}
          >
            {/* Phase header */}
            <button
              onClick={() => togglePhase(phase.id)}
              className="w-full flex items-center justify-between p-5 text-left"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `rgba(0,0,0,0.3)`, border: `1px solid ${phase.border}` }}
                >
                  <span className="text-xs font-black" style={{ color: phase.color }}>
                    {phaseCompleted === phase.steps.length ? "✓" : `${phaseCompleted}/${phase.steps.length}`}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-0.5" style={{ color: phase.color, opacity: 0.7 }}>
                    {phase.title} · {phase.timeframe}
                  </p>
                  <p className="text-white font-bold text-sm">{phase.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-1 rounded-full transition-all duration-500"
                    style={{ width: `${phasePct}%`, background: phase.color }}
                  />
                </div>
                <span className="text-white/25 text-xs">{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {/* Steps */}
            {isOpen && (
              <div className="px-5 pb-5 flex flex-col gap-2">
                {phase.steps.map((step) => {
                  const done = completed.has(step.id);
                  const platform = PLATFORM_COLORS[step.platform];
                  return (
                    <div
                      key={step.id}
                      className="rounded-xl p-3.5 transition-all"
                      style={{
                        background: done ? "rgba(52,211,153,0.05)" : "rgba(0,0,0,0.2)",
                        border: `1px solid ${done ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.04)"}`,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggle(step.id)}
                          className="shrink-0 mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all"
                          style={{
                            background: done ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.04)",
                            borderColor: done ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.12)",
                          }}
                        >
                          {done && (
                            <svg viewBox="0 0 10 10" fill="none" stroke="#34d399" strokeWidth="1.8" className="w-3 h-3">
                              <path d="M1.5 5l2.5 2.5L8.5 2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p
                              className="text-sm font-semibold leading-snug"
                              style={{ color: done ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.85)", textDecoration: done ? "line-through" : "none" }}
                            >
                              {step.task}
                            </p>
                            <span
                              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ background: platform.bg, border: `1px solid ${platform.border}`, color: platform.color }}
                            >
                              {platform.label}
                            </span>
                          </div>
                          {step.tip && !done && (
                            <p className="text-xs text-white/30 leading-relaxed">{step.tip}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="h-4" />
    </div>
  );
}
