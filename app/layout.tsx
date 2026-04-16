import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";

export const metadata: Metadata = {
  title: "Signal Dashboard",
  description: "Your personal command center for Bitcoin, productivity, and AI.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div
          className="flex h-screen text-zinc-100 overflow-hidden"
          style={{
            background: `
              radial-gradient(ellipse 130% 80% at 50% -5%, rgba(88, 28, 235, 0.28) 0%, rgba(88, 28, 235, 0.08) 45%, transparent 68%),
              radial-gradient(ellipse 70% 60% at 90% 85%, rgba(245, 158, 11, 0.09) 0%, transparent 55%),
              radial-gradient(ellipse 55% 45% at 10% 65%, rgba(99, 102, 241, 0.09) 0%, transparent 55%),
              radial-gradient(ellipse 40% 30% at 50% 100%, rgba(99, 102, 241, 0.05) 0%, transparent 60%),
              #030308
            `,
          }}
        >
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <DashboardHeader />
            <main className="flex-1 overflow-y-auto px-4 pb-8 md:px-8 md:pb-10">{children}</main>
          </div>
        </div>

        {/* Mobile bottom nav — visible only below md breakpoint */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16"
          style={{
            background: "rgba(3,3,8,0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Overview */}
          <Link
            href="/"
            className="flex items-center justify-center w-12 h-12"
            style={{ color: "#f59e0b", filter: "drop-shadow(0 0 6px rgba(245,158,11,0.5))" }}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
              <rect x="2" y="2" width="7" height="7" rx="1.5" />
              <rect x="11" y="2" width="7" height="7" rx="1.5" />
              <rect x="2" y="11" width="7" height="7" rx="1.5" />
              <rect x="11" y="11" width="7" height="7" rx="1.5" />
            </svg>
          </Link>
          {/* Bitcoin */}
          <Link
            href="/#bitcoin"
            className="flex items-center justify-center w-12 h-12 text-white/30 hover:text-white/70 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
              <path d="M7 4h5a2.5 2.5 0 010 5H7m0 0h5.5a2.5 2.5 0 010 5H7M7 2v16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          {/* Focus */}
          <Link
            href="/#focus"
            className="flex items-center justify-center w-12 h-12 text-white/30 hover:text-white/70 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
              <circle cx="10" cy="10" r="8" />
              <circle cx="10" cy="10" r="3.5" />
              <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
            </svg>
          </Link>
          {/* AI */}
          <Link
            href="/#ai"
            className="flex items-center justify-center w-12 h-12 text-white/30 hover:text-white/70 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
              <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" strokeLinejoin="round" />
              <path d="M16 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" strokeLinejoin="round" />
            </svg>
          </Link>
        </nav>
      </body>
    </html>
  );
}
