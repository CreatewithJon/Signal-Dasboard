import type { ReactNode, CSSProperties } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  id?: string;
  style?: CSSProperties;
  glow?: string;
}

export function Card({ children, className = "", id, style, glow }: CardProps) {
  return (
    <div
      id={id}
      className={`rounded-2xl ${className}`}
      style={{
        background: "rgba(255, 255, 255, 0.042)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: glow
          ? `inset 0 1px 0 rgba(255,255,255,0.10), 0 4px 32px rgba(0,0,0,0.3), ${glow}`
          : "inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 32px rgba(0,0,0,0.25)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
