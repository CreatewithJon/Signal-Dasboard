export default function DashboardHeader() {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header
      className="h-13 px-8 flex items-center justify-between shrink-0"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.015)",
      }}
    >
      <p className="text-sm text-white/30">
        {greeting},{" "}
        <span className="text-white/70 font-medium">Jonathan</span>
        <span className="mx-2 text-white/15">·</span>
        <span className="text-white/20">{date}</span>
      </p>
      <span
        className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase text-emerald-400 px-3 py-1 rounded-full"
        style={{
          background: "rgba(52,211,153,0.08)",
          border: "1px solid rgba(52,211,153,0.15)",
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
          style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }}
        />
        Live
      </span>
    </header>
  );
}
