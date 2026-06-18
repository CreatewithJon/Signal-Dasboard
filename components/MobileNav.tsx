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
];

const EXACT_ROUTES = ["/focus", "/planner", "/content", "/projects", "/memory", "/opportunities"];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16"
      style={{
        background: "rgba(3,3,8,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
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
    </nav>
  );
}
