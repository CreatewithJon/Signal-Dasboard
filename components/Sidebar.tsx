"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  {
    href: "/",
    label: "Overview",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <rect x="2" y="2" width="7" height="7" rx="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/#bitcoin",
    label: "Bitcoin",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <path d="M7 4h5a2.5 2.5 0 010 5H7m0 0h5.5a2.5 2.5 0 010 5H7M7 2v16" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/#focus",
    label: "Focus",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <circle cx="10" cy="10" r="8" />
        <circle cx="10" cy="10" r="3.5" />
        <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/#ai",
    label: "AI",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" strokeLinejoin="round" />
        <path d="M16 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-48 shrink-0 flex flex-col"
      style={{
        background: "rgba(255,255,255,0.02)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Brand */}
      <div
        className="px-5 py-6"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              boxShadow: "0 0 16px rgba(245, 158, 11, 0.4)",
            }}
          >
            <span className="text-black text-xs font-black">₿</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90 leading-none">Signal</p>
            <p className="text-[10px] text-white/30 mt-0.5">Personal OS</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map((item) => {
          const isActive = pathname === "/" && item.href === "/";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "text-white"
                  : "text-white/30 hover:text-white/70"
              }`}
              style={
                isActive
                  ? {
                      background: "rgba(255,255,255,0.07)",
                      backdropFilter: "blur(12px)",
                    }
                  : undefined
              }
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
