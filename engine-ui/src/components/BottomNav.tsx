// ─── DOCK NAV ────────────────────────────────────────────────────────────
// The mockup's floating "dock" (.dock-wrap/.dock/.dock-item), ported
// directly — same 5 destinations, same base/fill icon crossfade, same
// track-pill growth, same label flash on click. "Story" is the mockup's
// label for the Diagnosis destination (kept per the approved visual
// language); the route/file underneath stays named Diagnosis.
import { useEffect, useRef, useState } from "react";
import { navigateTo } from "../lib/navigate";
import type { Destination } from "../lib/destinations";
import { DESTINATIONS } from "../lib/destinations";

const LABELS: Record<Destination, string> = {
  diagnosis: "Story",
  blueprint: "Blueprint",
  "vision-pro": "Vision Pro",
  pulse: "Pulse",
  premium: "Premium",
};

const TITLES: Record<Destination, string> = {
  diagnosis: "Story",
  blueprint: "Conversion Blueprint",
  "vision-pro": "Vision Pro",
  pulse: "UX Pulse",
  premium: "Premium",
};

// Base (outline) + fill (gradient) path pairs, ported 1:1 from the mockup's
// inline SVGs. The fill copy references the shared #dockIconGrad gradient
// defined once below the dock.
const ICON_PATHS: Record<Destination, { d: string; strokeWidth: number; linejoin?: boolean }> = {
  diagnosis: { d: "M4 21V9l8-6 8 6v12h-5v-7H9v7H4z", strokeWidth: 1.8, linejoin: true },
  blueprint: { d: "M4 4h16v16H4z", strokeWidth: 1.6 },
  "vision-pro": { d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z", strokeWidth: 1.6 },
  pulse: { d: "M3 12h4l2-7 4 14 2-7h6", strokeWidth: 1.8, linejoin: true },
  premium: { d: "M12 3l2.2 6.2L20 11l-5.8 1.8L12 19l-2.2-6.2L4 11l5.8-1.8L12 3z", strokeWidth: 1.6, linejoin: true },
};

function DockIcon({ dest }: { dest: Destination }) {
  const { d, strokeWidth, linejoin } = ICON_PATHS[dest];
  const linecap = linejoin ? { strokeLinecap: "round" as const, strokeLinejoin: "round" as const } : {};
  return (
    <span className="di-meta">
      <svg className="di-ic-base" viewBox="0 0 24 24" fill="none">
        <path d={d} stroke="#fff" strokeWidth={strokeWidth} {...linecap} />
      </svg>
      <svg className="di-ic-fill" viewBox="0 0 24 24" fill="none">
        <path d={d} stroke="url(#dockIconGrad)" strokeWidth={strokeWidth} {...linecap} />
      </svg>
      {/* vision-pro icon also has an inner circle in the mockup */}
      {dest === "vision-pro" && (
        <>
          <svg className="di-ic-base" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", inset: 0 }}>
            <circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="1.6" />
          </svg>
          <svg className="di-ic-fill" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", inset: 0 }}>
            <circle cx="12" cy="12" r="3" stroke="url(#dockIconGrad)" strokeWidth="1.6" />
          </svg>
        </>
      )}
      {dest === "blueprint" && (
        <>
          <svg className="di-ic-base" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", inset: 0 }}>
            <path d="M4 9h16M9 9v11" stroke="#fff" strokeWidth="1.6" />
          </svg>
          <svg className="di-ic-fill" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", inset: 0 }}>
            <path d="M4 9h16M9 9v11" stroke="url(#dockIconGrad)" strokeWidth="1.6" />
          </svg>
        </>
      )}
    </span>
  );
}

export default function BottomNav({ auditId, current }: { auditId: string; current: Destination }) {
  const [labelFor, setLabelFor] = useState<Destination | null>(null);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); }, []);

  const flashLabel = (dest: Destination) => {
    setLabelFor(dest);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setLabelFor(null), 1400);
  };

  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <linearGradient id="dockIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14D571" />
            <stop offset="100%" stopColor="#7B7FFF" />
          </linearGradient>
        </defs>
      </svg>
      <nav className="dock-wrap">
        <div className="dock">
          {DESTINATIONS.map((dest) => {
            const active = dest === current;
            return (
              <button
                key={dest}
                type="button"
                className={`dock-item${active ? " active" : ""}${labelFor === dest ? " show-label" : ""}`}
                title={TITLES[dest]}
                onClick={() => {
                  flashLabel(dest);
                  if (!active) navigateTo(`/workspace/${auditId}/${dest}`);
                }}
              >
                <span className="di-label">{LABELS[dest]}</span>
                <DockIcon dest={dest} />
                <span className="di-track" />
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
