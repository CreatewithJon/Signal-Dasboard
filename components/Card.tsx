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
        background: "rgba(255, 255, 255, 0.04)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255, 255, 255, 0.07)",
        boxShadow: glow
          ? `inset 0 1px 0 rgba(255,255,255,0.08), ${glow}`
          : "inset 0 1px 0 rgba(255,255,255,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
