// ─── PREMIUM ────────────────────────────────────────────────────────────
// Agentic features that reason beyond a single read of a single site. None
// of the four are built this pass — each needs a real third-party
// integration this build doesn't have. Static "Coming soon" cards only, no
// functional stub beyond the label. Design Tool Plugins lives here and only
// here — never inline inside Pulse.
import { C, glass } from "../lib/workspace-shared";

const FEATURES = [
  {
    name: "UX Radar",
    description: "Diagnose named competitor URLs the same way, and see where your story genuinely differs.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={C.violet} strokeWidth="1.6" /><circle cx="12" cy="12" r="4.5" stroke={C.violet} strokeWidth="1.6" /><path d="M12 3v3M12 18v3M21 12h-3M6 12H3" stroke={C.violet} strokeWidth="1.6" strokeLinecap="round" /></svg>
    ),
  },
  {
    name: "Portfolio Pulse",
    description: "Cross-site drift reasoning and a periodic narrative summary for anyone managing more than one site.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="7" height="7" rx="1.5" stroke={C.violet} strokeWidth="1.6" /><rect x="14" y="4" width="7" height="7" rx="1.5" stroke={C.violet} strokeWidth="1.6" /><rect x="3" y="14" width="7" height="7" rx="1.5" stroke={C.violet} strokeWidth="1.6" /><rect x="14" y="14" width="7" height="7" rx="1.5" stroke={C.violet} strokeWidth="1.6" /></svg>
    ),
  },
  {
    name: "Revenue Vision",
    description: "Extends Vision Pro with real connected business outcome data in place of the click-based conversion proxy. Enterprise-tier.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 19V9M11 19V5M18 19v-7" stroke={C.violet} strokeWidth="1.8" strokeLinecap="round" /><path d="M3 19h18" stroke={C.violet} strokeWidth="1.8" strokeLinecap="round" /></svg>
    ),
  },
  {
    name: "Design Tool Plugins",
    description: "Surfaces UXpact's findings and suggested fixes contextually inside Figma, Framer, Webflow, and similar tools.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke={C.violet} strokeWidth="1.6" strokeLinecap="round" /><path d="M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke={C.violet} strokeWidth="1.6" strokeLinecap="round" /></svg>
    ),
  },
];

export default function Premium(_props: { auditId: string }) {
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "8px 28px 40px" }}>
      <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 26, fontWeight: 700, color: C.navy, letterSpacing: "-0.5px", margin: "0 0 4px" }}>
        <span style={{ background: "linear-gradient(90deg,#186132,#14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Premium</span>
      </h1>
      <p style={{ fontSize: 14, color: C.muted, margin: "0 0 24px" }}>Agentic features that reason beyond a single read of a single site.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {FEATURES.map((f) => (
          <div key={f.name} style={{ ...glass, borderRadius: 16, padding: "22px 22px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(91,97,244,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>{f.icon}</div>
              <span style={{ fontSize: 9.5, fontWeight: 700, background: "rgba(91,97,244,0.1)", color: C.violet, borderRadius: 20, padding: "3px 10px", letterSpacing: "0.04em", textTransform: "uppercase" }}>Coming soon</span>
            </div>
            <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 14, fontWeight: 700, color: C.navy }}>{f.name}</div>
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55 }}>{f.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
