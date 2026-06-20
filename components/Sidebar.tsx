"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";

type NavItem = {
  href: string;
  label: string;
  soon?: boolean;
  icon: React.ReactNode;
};

const PRIMARY_NAV: NavItem[] = [
  {
    href: "/",
    label: "Command Center",
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
    href: "/#ai",
    label: "AI",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" strokeLinejoin="round" />
        <path d="M16 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/#bitcoin",
    label: "Signals",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <path d="M7 4h5a2.5 2.5 0 010 5H7m0 0h5.5a2.5 2.5 0 010 5H7M7 2v16" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/#focus",
    label: "Tasks",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <circle cx="10" cy="10" r="8" />
        <circle cx="10" cy="10" r="3.5" />
        <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

const MODULE_NAV: NavItem[] = [
  {
    href: "/chief",
    label: "Chief of Staff",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
        <path d="M10 2L12.5 7H18L13.5 10.5L15 16L10 13L5 16L6.5 10.5L2 7H7.5L10 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/strategy",
    label: "Strategy",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <path d="M10 2L14 8H18L14 12L15.5 18L10 15L4.5 18L6 12L2 8H6L10 2Z" strokeLinejoin="round" />
        <path d="M10 7v5M7.5 12h5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/goals",
    label: "Goals",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 6v4l3 3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/review",
    label: "Weekly Review",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <rect x="3" y="4" width="14" height="13" rx="2" />
        <path d="M3 8h14" strokeLinecap="round" />
        <path d="M6 12l2.5 2L14 10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/actions",
    label: "Actions",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <path d="M10 2l1.5 3.5 3.5.5-2.5 2.5.5 3.5L10 10.5 7 12l.5-3.5L5 6l3.5-.5L10 2z" strokeLinejoin="round" />
        <path d="M4 16h12" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/opportunities",
    label: "Opportunities",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <circle cx="10" cy="10" r="7" />
        <path d="M10 7v3l2 2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/graph",
    label: "Knowledge Graph",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <circle cx="3" cy="10" r="2" />
        <circle cx="17" cy="5" r="2" />
        <circle cx="17" cy="15" r="2" />
        <circle cx="10" cy="3" r="1.5" />
        <path d="M5 10h5M15 5.5L10 4M15 14.5L5 10.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/relationships",
    label: "Relationships",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <circle cx="7" cy="7" r="3" />
        <path d="M1 17c0-3.3 2.7-6 6-6h2" strokeLinecap="round" />
        <circle cx="14" cy="11" r="2.5" />
        <path d="M11 19c0-1.7 1.3-3 3-3s3 1.3 3 3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/focus",
    label: "Focus Engine",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <circle cx="10" cy="10" r="8" />
        <circle cx="10" cy="10" r="3.5" />
        <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/daily",
    label: "Daily Rhythm",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 6v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/briefing",
    label: "Daily Briefing",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <path d="M10 2a7 7 0 00-7 7c0 2.8 1.6 5.2 4 6.4V17h6v-1.6c2.4-1.2 4-3.6 4-6.4a7 7 0 00-7-7z" strokeLinejoin="round" />
        <path d="M8 17h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/planner",
    label: "Planner",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <rect x="3" y="4" width="14" height="13" rx="2" />
        <path d="M3 8h14" strokeLinecap="round" />
        <path d="M7 2v4M13 2v4" strokeLinecap="round" />
        <path d="M7 12h2M7 15h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/content",
    label: "Content",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <rect x="2" y="5" width="16" height="10" rx="2" />
        <path d="M6 5V3M14 5V3M2 9h16" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/brand",
    label: "Brand",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <path d="M10 2l2 5h5l-4 3 1.5 5L10 12l-4.5 3L7 10 3 7h5z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/projects",
    label: "Projects",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <path d="M3 5a2 2 0 012-2h4l2 2h4a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/memory",
    label: "Memory",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <path d="M4 6h12M4 10h8M4 14h10" strokeLinecap="round" />
      </svg>
    ),
  },
];

const SYSTEM_NAV: NavItem[] = [
  {
    href: "/system",
    label: "System Health",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <path d="M2 10h3l2-5 2 10 2-6 2 4 1-3h4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/workspaces",
    label: "Workspaces",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <rect x="2" y="2" width="7" height="7" rx="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" />
        <rect x="2" y="11" width="7" height="5" rx="1.5" />
        <rect x="11" y="11" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/beta",
    label: "Beta Overview",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" strokeLinejoin="round" />
        <path d="M16 14l1 3M18 16l-3 1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/leads",
    label: "Leads",
    soon: true,
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <path d="M9 12H5a2 2 0 00-2 2v2" strokeLinecap="round" />
        <circle cx="7" cy="7" r="3" />
        <path d="M13 8h4M13 11h4M13 14h2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
        <circle cx="10" cy="10" r="2.5" />
        <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.41 1.41M14.37 14.37l1.41 1.41M4.22 15.78l1.41-1.41M14.37 5.63l1.41-1.41" strokeLinecap="round" />
      </svg>
    ),
  },
];

const FULL_NAV = [...MODULE_NAV.map((i) => i.href), ...SYSTEM_NAV.map((i) => i.href)];

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = FULL_NAV.includes(item.href)
    ? pathname === item.href
    : pathname === "/" && item.href === "/";

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
        isActive ? "text-white" : "text-white/30 hover:text-white/65"
      }`}
      style={
        isActive
          ? {
              background: "rgba(255,255,255,0.07)",
              backdropFilter: "blur(12px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
            }
          : undefined
      }
    >
      {item.icon}
      <span className="flex-1">{item.label}</span>
      {item.soon && (
        <span
          className="text-[8px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(139,92,246,0.12)", color: "rgba(167,139,250,0.5)", border: "1px solid rgba(139,92,246,0.18)" }}
        >
          Soon
        </span>
      )}
    </Link>
  );
}

function NavSection({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  return (
    <div>
      <p
        className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-[0.2em]"
        style={{ color: "rgba(255,255,255,0.15)" }}
      >
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex w-52 shrink-0 flex-col"
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
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
              boxShadow: "0 0 20px rgba(139,92,246,0.4), 0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.6" className="w-4 h-4">
              <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-white/90 leading-none tracking-tight">Sovereign OS</p>
            <p className="text-[10px] text-white/25 mt-0.5 tracking-wide">Personal OS</p>
          </div>
        </div>
        <div className="mt-3">
          <WorkspaceSwitcher />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-5 overflow-y-auto">
        <NavSection label="Core" items={PRIMARY_NAV} pathname={pathname} />
        <NavSection label="Modules" items={MODULE_NAV} pathname={pathname} />
        <NavSection label="System" items={SYSTEM_NAV} pathname={pathname} />
      </nav>
    </aside>
  );
}
