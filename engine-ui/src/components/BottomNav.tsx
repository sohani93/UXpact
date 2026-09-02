import type { ReactNode } from "react";
import { C } from "../lib/workspace-shared";
import { navigateTo } from "../lib/navigate";
import type { Destination } from "../lib/destinations";
import { DESTINATIONS } from "../lib/destinations";

const ICONS: Record<Destination, ReactNode> = {
  diagnosis: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <path d="M9 3v4a2 2 0 002 2h2a2 2 0 002-2V3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 6H5a2 2 0 00-2 2v10a3 3 0 003 3h12a3 3 0 003-3V8a2 2 0 00-2-2h-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 13h3M8 17h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  blueprint: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 9h18M8 4v5M8 20v-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="15" cy="14" r="2.4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  "vision-pro": (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  pulse: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <path d="M3 12h4l2-7 4 14 2-7h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  premium: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <path d="M12 2.5l2.6 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.4l-5.3 2.9 1.1-6.1L3.3 8.9l6.1-.8L12 2.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  ),
};

const LABELS: Record<Destination, string> = {
  diagnosis: "Diagnosis",
  blueprint: "Blueprint",
  "vision-pro": "Vision Pro",
  pulse: "Pulse",
  premium: "Premium",
};

export default function BottomNav({ auditId, current }: { auditId: string; current: Destination }) {
  return (
    <nav
      style={{
        position: "fixed", left: "50%", bottom: 18, transform: "translateX(-50%)", zIndex: 200,
        display: "flex", alignItems: "center", gap: 2,
        background: "rgba(255,255,255,0.72)", backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)",
        border: "1px solid rgba(255,255,255,0.75)", borderRadius: 22,
        boxShadow: "0 10px 34px rgba(11,28,72,0.14), inset 0 1px 0 rgba(255,255,255,0.8)",
        padding: 6,
      }}
    >
      {DESTINATIONS.map((dest) => {
        const active = dest === current;
        return (
          <button
            key={dest}
            onClick={() => { if (!active) navigateTo(`/workspace/${auditId}/${dest}`); }}
            aria-current={active ? "page" : undefined}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
              width: 68, padding: "8px 4px 7px", borderRadius: 16, border: "none", cursor: active ? "default" : "pointer",
              background: active ? "linear-gradient(135deg,#186132,#14D571)" : "transparent",
              color: active ? "#fff" : C.muted,
              transition: "all 0.18s",
            }}
          >
            {ICONS[dest]}
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9.5, fontWeight: active ? 700 : 500, letterSpacing: "0.01em" }}>
              {LABELS[dest]}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
