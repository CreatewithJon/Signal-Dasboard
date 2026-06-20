"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/chief",
    label: "Chief",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
        <path d="M10 2L12.5 7H18L13.5 10.5L15 16L10 13L5 16L6.5 10.5L2 7H7.5L10 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/strategy",
    label: "Strategy",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
        <path d="M10 2L14 8H18L14 12L15.5 18L10 15L4.5 18L6 12L2 8H6L10 2Z" strokeLinejoin="round" />
        <path d="M10 7v5M7.5 12h5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/goals",
    label: "Goals",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 6v4l3 3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/review",
    label: "Review",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
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
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
        <path d="M10 2l1.5 3.5 3.5.5-2.5 2.5.5 3.5L10 10.5 7 12l.5-3.5L5 6l3.5-.5L10 2z" strokeLinejoin="round" />
        <path d="M4 16h12" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/",
    label: "Home",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
        <rect x="2" y="2" width="7" height="7" rx="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/daily",
    label: "Daily",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 6v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/focus",
    label: "Focus",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
        <circle cx="10" cy="10" r="8" />
        <circle cx="10" cy="10" r="3.5" />
        <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/projects",
    label: "Projects",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
        <path d="M3 5a2 2 0 012-2h4l2 2h4a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/content",
    label: "Content",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
        <rect x="2" y="5" width="16" height="10" rx="2" />
        <path d="M6 5V3M14 5V3M2 9h16" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/planner",
    label: "Planner",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
        <rect x="3" y="4" width="14" height="13" rx="2" />
        <path d="M3 8h14" strokeLinecap="round" />
        <path d="M7 2v4M13 2v4" strokeLinecap="round" />
        <path d="M7 12h2M7 15h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/memory",
    label: "Memory",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
        <path d="M4 6h12M4 10h8M4 14h10" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/opportunities",
    label: "Opps",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
        <circle cx="10" cy="10" r="7" />
        <path d="M10 7v3l2 2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/graph",
    label: "Graph",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
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
    label: "People",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
        <circle cx="7" cy="7" r="3" />
        <path d="M1 17c0-3.3 2.7-6 6-6h2" strokeLinecap="round" />
        <circle cx="14" cy="11" r="2.5" />
        <path d="M11 19c0-1.7 1.3-3 3-3s3 1.3 3 3" strokeLinecap="round" />
      </svg>
    ),
  },
];

const EXACT_ROUTES = ["/daily", "/focus", "/planner", "/content", "/projects", "/memory", "/opportunities", "/relationships", "/graph", "/actions", "/chief", "/strategy", "/goals", "/review"];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background:           "rgba(3,3,8,0.92)",
        backdropFilter:       "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop:            "1px solid rgba(255,255,255,0.06)",
        // iOS home indicator safe zone
        paddingBottom:        "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-center justify-around h-16">
      {navItems.map((item) => {
        const isActive = EXACT_ROUTES.includes(item.href)
          ? pathname === item.href
          : pathname === "/" && item.href === "/";
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center gap-1 w-12 h-14 shrink-0 transition-all"
            style={{
              color: isActive ? "#8b5cf6" : "rgba(255,255,255,0.28)",
              filter: isActive ? "drop-shadow(0 0 6px rgba(139,92,246,0.6))" : "none",
            }}
          >
            {item.icon}
            <span className="text-[8px] font-semibold tracking-wide">{item.label}</span>
          </Link>
        );
      })}
      </div>
    </nav>
  );
}
