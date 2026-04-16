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
              radial-gradient(ellipse 120% 70% at 50% -10%, rgba(88, 28, 235, 0.22) 0%, transparent 65%),
              radial-gradient(ellipse 60% 50% at 90% 80%, rgba(245, 158, 11, 0.06) 0%, transparent 55%),
              radial-gradient(ellipse 50% 40% at 10% 60%, rgba(99, 102, 241, 0.07) 0%, transparent 55%),
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
