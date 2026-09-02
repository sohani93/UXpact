// ─── PREMIUM ────────────────────────────────────────────────────────────
// Agentic features that reason beyond a single read of a single site. None
// of the four are built this pass — each needs a real third-party
// integration this build doesn't have. Static "Coming soon" cards only, no
// functional stub beyond the label — markup/copy/icons ported 1:1 from the
// approved mockup's .premium-grid/.premium-card.
import { useEffect, useState } from "react";

const FEATURES = [
  {
    name: "UX Radar",
    description: "See where your story genuinely differs from competitors, and where it doesn't.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M4 6h6M4 12h9M4 18h4" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M17 5l3 3-8 8-3.5 1L9 14l8-9z" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "Portfolio Pulse",
    description: "One view across every site you manage, and what's regressing where.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="6" cy="18" r="2.4" stroke="#fff" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="2.4" stroke="#fff" strokeWidth="1.8" />
        <circle cx="18" cy="6" r="2.4" stroke="#fff" strokeWidth="1.8" />
        <path d="M8 16.5L10 14M14 10L16 7.5" stroke="#fff" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    name: "Revenue Vision",
    description: "Testing grounded in real revenue, not a click — governed automatically at scale.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M4 18l4-9 4 6 4-11 4 14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "Design Tool Plugins",
    description: "This same diagnosis, inside Figma, Framer, Webflow and WordPress.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="1.8" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="1.8" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="1.8" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="1.8" />
      </svg>
    ),
  },
];

export default function Premium(_props: { auditId: string }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setRevealed(true), 40);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      <div className="panel-eyebrow">Premium — agentic features that reason beyond a single read</div>
      <div className="premium-grid">
        {FEATURES.map((f, i) => (
          <div key={f.name} className={`premium-card${revealed ? " in" : ""}`} style={{ transitionDelay: `${120 + i * 90}ms` }}>
            <div className="premium-ic">{f.icon}</div>
            <div className="premium-title">{f.name} <span className="badge">Coming soon</span></div>
            <div className="premium-desc">{f.description}</div>
          </div>
        ))}
      </div>
    </>
  );
}
