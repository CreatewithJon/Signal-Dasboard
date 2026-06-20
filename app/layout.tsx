import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import MobileNav from "@/components/MobileNav";
import StorageMigration from "@/components/StorageMigration";
import AuthListener from "@/components/auth/AuthListener";
import FocusSessionCleanup from "@/components/FocusSessionCleanup";
import DemoModeBadge from "@/components/DemoModeBadge";

export const metadata: Metadata = {
  title: "Sovereign OS",
  description: "A personal AI operating system for building, organizing, and executing in the AI-powered digital era.",
};

// Enable env(safe-area-inset-*) CSS variables for iOS notch/home-indicator support
export const viewport: Viewport = {
  width:       "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StorageMigration />
        <AuthListener />
        <FocusSessionCleanup />
        <DemoModeBadge />
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
            {/* pb-32 covers fixed MobileNav (64px) + iOS safe-area (~34px) + margin */}
            <main className="flex-1 overflow-y-auto px-4 pb-32 md:px-8 md:pb-10">{children}</main>
          </div>
        </div>

        <MobileNav />
      </body>
    </html>
  );
}
