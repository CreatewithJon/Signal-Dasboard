import type { Metadata } from "next";
import type { ReactNode } from "react";
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
            <main className="flex-1 overflow-y-auto px-8 pb-10">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
