"use client";

import { useState, useRef, useCallback } from "react";
import { Card } from "@/components/Card";

interface Segment { start: number; end: number; text: string; }
interface BRollMoment {
  id: string; timestamp: number; duration: number;
  description: string; prompt: string; quote: string;
}
interface ClipStatus {
  momentId: string; status: "idle" | "generating" | "polling" | "done" | "error";
  jobId?: string; url?: string; error?: string;
}

type Step = "upload" | "transcribing" | "planning" | "review" | "generating" | "done";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function BRollPipeline() {
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [moments, setMoments] = useState<BRollMoment[]>([]);
  const [clips, setClips] = useState<ClipStatus[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 1: Transcribe ──
  async function handleFile(file: File) {
    if (!file) return;
    setError("");
    setStep("transcribing");

    const fd = new FormData();
    fd.append("file", file, file.name);

    try {
      const res = await fetch("/api/broll/transcribe", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) { setError(data.error); setStep("upload"); return; }
      setSegments(data.segments ?? []);
      setStep("planning");
      await planBRoll(data.fullText ?? "", data.segments ?? []);
    } catch {
      setError("Transcription failed. Try again.");
      setStep("upload");
    }
  }

  // ── Step 2: Plan ──
  async function planBRoll(text: string, segs: Segment[]) {
    try {
      const res = await fetch("/api/broll/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, segments: segs }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setStep("upload"); return; }
      setMoments(data.moments ?? []);
      setStep("review");
    } catch {
      setError("Planning failed. Try again.");
      setStep("upload");
    }
  }

  // ── Step 3: Generate clips ──
  async function generateAll() {
    setStep("generating");
    const initialClips: ClipStatus[] = moments.map((m) => ({ momentId: m.id, status: "idle" }));
    setClips(initialClips);

    for (const moment of moments) {
      // Start generation
      setClips((prev) => prev.map((c) => c.momentId === moment.id ? { ...c, status: "generating" } : c));

      try {
        const res = await fetch("/api/broll/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: moment.prompt, duration: moment.duration }),
        });
        const data = await res.json();

        if (data.error || !data.jobId) {
          const errMsg = data.details ? `${data.error}: ${data.details}` : (data.error ?? "No job ID returned");
          setClips((prev) => prev.map((c) => c.momentId === moment.id
            ? { ...c, status: "error", error: errMsg } : c));
          continue;
        }

        const jobId = data.jobId;
        setClips((prev) => prev.map((c) => c.momentId === moment.id ? { ...c, status: "polling", jobId } : c));

        // Poll for completion
        await pollClip(moment.id, jobId);
      } catch {
        setClips((prev) => prev.map((c) => c.momentId === moment.id
          ? { ...c, status: "error", error: "Request failed" } : c));
      }
    }

    setStep("done");
  }

  const pollClip = useCallback(async (momentId: string, jobId: string) => {
    const maxAttempts = 40;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const res = await fetch(`/api/broll/status?jobId=${jobId}`);
        const data = await res.json();
        if (data.status === "completed" && data.url) {
          setClips((prev) => prev.map((c) => c.momentId === momentId
            ? { ...c, status: "done", url: data.url } : c));
          return;
        }
        if (data.status === "failed") {
          setClips((prev) => prev.map((c) => c.momentId === momentId
            ? { ...c, status: "error", error: "Generation failed" } : c));
          return;
        }
      } catch {}
    }
    setClips((prev) => prev.map((c) => c.momentId === momentId
      ? { ...c, status: "error", error: "Timed out" } : c));
  }, []);

  function updateMoment(id: string, field: keyof BRollMoment, value: string | number) {
    setMoments((prev) => prev.map((m) => m.id === id ? { ...m, [field]: value } : m));
  }

  function removeMoment(id: string) {
    setMoments((prev) => prev.filter((m) => m.id !== id));
  }

  function copyDescriptGuide() {
    const lines = moments.map((m, i) => {
      const clip = clips.find((c) => c.momentId === m.id);
      return `B-Roll ${i + 1} @ ${formatTime(m.timestamp)} (${m.duration}s)\n  Visual: ${m.description}\n  Quote: "${m.quote}"\n  Clip URL: ${clip?.url ?? "pending"}`;
    });
    navigator.clipboard.writeText(lines.join("\n\n"));
  }

  const STEPS = ["Upload", "Transcribe", "Plan", "Review", "Generate", "Done"];
  const stepIndex = { upload: 0, transcribing: 1, planning: 2, review: 3, generating: 4, done: 5 }[step];

  return (
    <div className="max-w-4xl mx-auto pb-16">

      {/* Header */}
      <section className="relative py-12 text-center">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 60% 60% at 50% 30%, rgba(139,92,246,0.12) 0%, transparent 70%)",
        }} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-violet-400/60 mb-4 relative">B-Roll Pipeline</p>
        <h1 className="text-4xl font-bold tracking-[-0.02em] mb-4 relative" style={{
          background: "linear-gradient(165deg, rgba(255,255,255,0.97) 20%, rgba(255,255,255,0.5) 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          Upload. Transcribe.<br />Generate B-Roll.
        </h1>
        <p className="text-sm text-white/25 max-w-sm mx-auto leading-relaxed relative">
          Whisper transcribes your video. Claude plans the B-roll. Higgsfield generates the clips. You assemble in Descript.
        </p>
      </section>

      {/* Progress steps */}
      <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
              style={{
                background: i === stepIndex ? "rgba(139,92,246,0.15)" : i < stepIndex ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${i === stepIndex ? "rgba(139,92,246,0.3)" : i < stepIndex ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)"}`,
                color: i === stepIndex ? "rgba(196,181,253,0.9)" : i < stepIndex ? "rgba(52,211,153,0.7)" : "rgba(255,255,255,0.2)",
              }}
            >
              {i < stepIndex && "✓ "}{s}
            </div>
            {i < STEPS.length - 1 && <span className="text-white/10 text-xs">→</span>}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm text-rose-400" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}

      {/* ── Upload ── */}
      {step === "upload" && (
        <Card className="p-8" glow="0 0 60px rgba(139,92,246,0.06)">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all"
            style={{
              borderColor: dragOver ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.08)",
              background: dragOver ? "rgba(139,92,246,0.05)" : "transparent",
            }}
          >
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-violet-400/60">
                <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-white/60 font-semibold text-sm mb-1">Drop your video here</p>
            <p className="text-white/20 text-xs">or click to browse · MP4, MOV, MP3, M4A · Max 25MB</p>
            <input ref={fileInputRef} type="file" accept="video/*,audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {/* CloudConvert tip */}
          <div
            className="mt-5 flex items-start gap-3 p-4 rounded-xl"
            style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)" }}
          >
            <span className="text-amber-400/60 text-base shrink-0 mt-0.5">⚡</span>
            <div>
              <p className="text-xs font-semibold text-amber-400/70 mb-1">iPhone video too large?</p>
              <p className="text-xs text-white/25 leading-relaxed">
                iPhone 4K videos often exceed 25MB. Use{" "}
                <a
                  href="https://cloudconvert.com/mov-to-mp3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400/60 underline hover:text-amber-400/90 transition-colors"
                >
                  cloudconvert.com
                </a>
                {" "}to convert your .mov to .mp3 first — audio-only files are under 2MB and work perfectly with Whisper.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-3">
            {[
              { icon: "🎙", label: "Whisper", desc: "Auto transcription" },
              { icon: "🧠", label: "Claude", desc: "B-roll planning" },
              { icon: "🎬", label: "Higgsfield", desc: "Clip generation" },
              { icon: "✂️", label: "Descript", desc: "Manual assembly" },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-lg mb-1">{icon}</p>
                <p className="text-[10px] font-bold text-white/50">{label}</p>
                <p className="text-[9px] text-white/20">{desc}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Transcribing / Planning loading ── */}
      {(step === "transcribing" || step === "planning") && (
        <Card className="p-12 flex flex-col items-center justify-center text-center gap-4">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-3 h-3 rounded-full animate-bounce"
                style={{ background: "rgba(139,92,246,0.6)", animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
          <p className="text-white/60 font-semibold text-sm">
            {step === "transcribing" ? "Transcribing with Whisper..." : "Claude is planning your B-roll..."}
          </p>
          <p className="text-white/20 text-xs">
            {step === "transcribing" ? "This may take 30–60 seconds depending on video length." : "Analyzing transcript and identifying the best moments..."}
          </p>
        </Card>
      )}

      {/* ── Review plan ── */}
      {step === "review" && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400/60 mb-1">B-Roll Plan</p>
              <p className="text-white/60 text-sm">{moments.length} moments identified — review and edit before generating</p>
            </div>
            <button
              onClick={generateAll}
              disabled={moments.length === 0}
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(139,92,246,0.15))",
                border: "1px solid rgba(139,92,246,0.4)",
                color: "rgba(196,181,253,0.95)",
                boxShadow: "0 0 20px rgba(139,92,246,0.2)",
              }}
            >
              Generate {moments.length} Clips →
            </button>
          </div>

          {/* Transcript preview */}
          {segments.length > 0 && (
            <Card className="p-4" style={{ maxHeight: 160, overflowY: "auto" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/25 mb-2">Transcript</p>
              <div className="flex flex-col gap-1">
                {segments.map((s, i) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <span className="text-white/20 shrink-0 tabular-nums">{formatTime(s.start)}</span>
                    <span className="text-white/50">{s.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Moments */}
          {moments.map((moment, idx) => (
            <Card key={moment.id} className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm"
                    style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(196,181,253,0.8)" }}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-white/70 font-semibold text-sm">{moment.description}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-violet-400/60">@ {formatTime(moment.timestamp)}</span>
                      <span className="text-white/15 text-[10px]">·</span>
                      <span className="text-[10px] text-white/30">{moment.duration}s</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => removeMoment(moment.id)} className="text-white/20 hover:text-rose-400/60 transition-colors text-lg shrink-0">×</button>
              </div>

              <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/20 mb-1">Quote from video</p>
                <p className="text-xs text-white/40 italic">&ldquo;{moment.quote}&rdquo;</p>
              </div>

              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/20 mb-2">Generation Prompt — edit if needed</p>
                <textarea
                  value={moment.prompt}
                  onChange={(e) => updateMoment(moment.id, "prompt", e.target.value)}
                  rows={2}
                  className="w-full bg-transparent text-xs text-white/60 placeholder:text-white/20 focus:outline-none resize-none leading-relaxed"
                  style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 10, padding: "10px 12px" }}
                />
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <p className="text-[9px] text-white/20 mb-1">Timestamp (s)</p>
                  <input
                    type="number"
                    value={moment.timestamp}
                    onChange={(e) => updateMoment(moment.id, "timestamp", parseFloat(e.target.value))}
                    className="w-20 bg-transparent text-xs text-white/60 focus:outline-none text-center"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 8px" }}
                  />
                </div>
                <div>
                  <p className="text-[9px] text-white/20 mb-1">Duration (s)</p>
                  <input
                    type="number"
                    value={moment.duration}
                    min={2} max={8}
                    onChange={(e) => updateMoment(moment.id, "duration", parseInt(e.target.value))}
                    className="w-20 bg-transparent text-xs text-white/60 focus:outline-none text-center"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 8px" }}
                  />
                </div>
              </div>
            </Card>
          ))}

          <button
            onClick={generateAll}
            disabled={moments.length === 0}
            className="w-full py-4 rounded-2xl text-sm font-bold transition-all disabled:opacity-30"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(139,92,246,0.1))",
              border: "1px solid rgba(139,92,246,0.35)",
              color: "rgba(196,181,253,0.95)",
              boxShadow: "0 0 30px rgba(139,92,246,0.15)",
            }}
          >
            Generate {moments.length} B-Roll Clips with Higgsfield →
          </button>
        </div>
      )}

      {/* ── Generating / Done ── */}
      {(step === "generating" || step === "done") && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400/60 mb-1">
                {step === "generating" ? "Generating Clips..." : "Clips Ready"}
              </p>
              <p className="text-white/40 text-sm">
                {clips.filter((c) => c.status === "done").length} / {clips.length} complete
              </p>
            </div>
            {step === "done" && (
              <button
                onClick={copyDescriptGuide}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "rgba(52,211,153,0.9)" }}
              >
                Copy Descript Guide
              </button>
            )}
          </div>

          {moments.map((moment, idx) => {
            const clip = clips.find((c) => c.momentId === moment.id);
            const status = clip?.status ?? "idle";
            return (
              <Card key={moment.id} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm"
                    style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(196,181,253,0.8)" }}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 font-semibold text-sm mb-0.5">{moment.description}</p>
                    <p className="text-[10px] text-violet-400/50">@ {formatTime(moment.timestamp)} · {moment.duration}s</p>

                    <div className="mt-3 flex items-center gap-2">
                      {status === "idle" && <span className="text-[10px] text-white/20">Waiting...</span>}
                      {(status === "generating" || status === "polling") && (
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[0,1,2].map((i) => (
                              <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                                style={{ background: "rgba(139,92,246,0.6)", animationDelay: `${i*150}ms` }} />
                            ))}
                          </div>
                          <span className="text-[10px] text-violet-400/50">
                            {status === "generating" ? "Starting generation..." : "Generating clip..."}
                          </span>
                        </div>
                      )}
                      {status === "done" && clip?.url && (
                        <a
                          href={clip.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                          style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "rgba(52,211,153,0.9)" }}
                        >
                          Download Clip ↗
                        </a>
                      )}
                      {status === "error" && (
                        <span className="text-[10px] text-rose-400/70">{clip?.error ?? "Failed"}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {step === "done" && (
            <Card className="p-6" style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.12)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/60 mb-3">Next Step: Assemble in Descript</p>
              <ol className="flex flex-col gap-2">
                {[
                  "Import your original talking-head video into Descript",
                  "Download each B-roll clip using the buttons above",
                  "In Descript, find the matching words in the transcript",
                  "Drag each B-roll clip onto the timeline at the flagged timestamp",
                  "Adjust timing as needed, then export your final video",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs text-white/40">
                    <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
                      style={{ background: "rgba(52,211,153,0.1)", color: "rgba(52,211,153,0.7)" }}>
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <button
                onClick={() => { setStep("upload"); setMoments([]); setClips([]); setSegments([]); }}
                className="mt-4 text-xs text-white/25 hover:text-white/50 transition-colors"
              >
                ← Process another video
              </button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
