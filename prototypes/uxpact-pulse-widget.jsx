import { useState } from "react";

const C = {
  bg: "#EEF1F5",
  forest: "#186132", emerald: "#148C59", mint: "#14D571",
  violet: "#5B61F4", navy: "#0B1C48",
  textMuted: "#6B7280", textDim: "#9CA3AF",
  red: "#DC2626", amber: "#F59E0B",
};

const ITEMS = [
  { text: "Rewrite H1 with outcome-led copy", sev: "Critical", emoji: "🔴" },
  { text: "Move CTA above fold on mobile", sev: "Critical", emoji: "🔴" },
  { text: "Restructure: context → desire → action", sev: "Critical", emoji: "🔴" },
  { text: "Add trust signals in first viewport", sev: "Major", emoji: "🟠" },
  { text: "Fix heading hierarchy — add H2 after H1", sev: "Major", emoji: "🟠" },
  { text: "Add low-risk entry point (demo/preview)", sev: "Major", emoji: "🟠" },
  { text: "Add meta description", sev: "Major", emoji: "🟠" },
  { text: "Rewrite body copy: benefits over features", sev: "Major", emoji: "🟠" },
  { text: "Add alt text to 3 images", sev: "Minor", emoji: "🟡" },
  { text: "Link logo to homepage", sev: "Minor", emoji: "🟡" },
  { text: "Add OG image meta tag", sev: "Minor", emoji: "🟡" },
  { text: 'Replace "we" language with "you" language', sev: "Minor", emoji: "🟡" },
];

const sevOrder = { Critical: 0, Major: 1, Minor: 2 };
const sevColor = { Critical: C.red, Major: C.amber, Minor: C.emerald };

function PulseIcon({ size = 28 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.29, background: "linear-gradient(145deg, #14D571, #148C59)", boxShadow: "0 2px 6px rgba(20,140,89,0.35), inset 0 1px 0 rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: size * 0.5, color: "#fff", fontWeight: 700 }}>
      ◉
    </div>
  );
}

function VioletCheck({ checked, onClick }) {
  return (
    <div onClick={onClick} style={{
      width: 20, height: 20, borderRadius: 5, flexShrink: 0, cursor: "pointer",
      background: checked ? "#5B61F4" : "transparent",
      border: checked ? "2px solid #5B61F4" : "2px solid rgba(0,0,0,0.15)",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.15s ease",
    }}>
      {checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </div>
  );
}

function PulseWidgetInner() {
  const [checks, setChecks] = useState(ITEMS.map(() => false));
  const [expanded, setExpanded] = useState(true);

  const done = checks.filter(Boolean).length;
  const total = checks.length;
  const pct = total > 0 ? (done / total) * 100 : 0;
  const allDone = done === total;

  const toggle = (i) => {
    const n = [...checks];
    n[i] = !n[i];
    setChecks(n);
  };

  const grouped = {};
  ITEMS.forEach((item, i) => {
    if (!grouped[item.sev]) grouped[item.sev] = [];
    grouped[item.sev].push({ ...item, idx: i });
  });
  const sevGroups = Object.entries(grouped).sort(([a], [b]) => sevOrder[a] - sevOrder[b]);

  // ─── MINIMISED PILL ───
  if (!expanded) {
    return (
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}>
        <div onClick={() => setExpanded(true)} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
          borderRadius: 14,
          background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.7)",
          cursor: "pointer", transition: "all 0.2s",
        }}>
          <PulseIcon size={26} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, fontFamily: "'Unbounded',sans-serif" }}>Pulse</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.violet, fontFamily: "'Space Grotesk',sans-serif" }}>{done}/{total} done</div>
          </div>
          <svg width={28} height={28} viewBox="0 0 28 28">
            <circle cx={14} cy={14} r={11} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={3} />
            <circle cx={14} cy={14} r={11} fill="none" stroke="url(#miniGrad)" strokeWidth={3}
              strokeDasharray={2 * Math.PI * 11}
              strokeDashoffset={2 * Math.PI * 11 * (1 - pct / 100)}
              strokeLinecap="round" transform="rotate(-90 14 14)" />
            <defs>
              <linearGradient id="miniGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={C.emerald} /><stop offset="100%" stopColor={C.violet} />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    );
  }

  // ─── COMPLETED STATE ───
  if (allDone) {
    return (
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, width: 340 }}>
        <div style={{
          borderRadius: 16,
          background: "rgba(255,255,255,0.7)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.7)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "32px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>💜</div>
            <h3 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 16, fontWeight: 700, color: C.navy, margin: "0 0 6px" }}>All fixes done!</h3>
            <p style={{ fontSize: 12.5, color: C.textMuted, margin: "0 0 20px", lineHeight: 1.5, fontFamily: "'Space Grotesk',sans-serif" }}>
              Every item on your checklist has been implemented.
            </p>
            <div style={{ width: "100%", height: 4, borderRadius: 2, background: `linear-gradient(90deg, ${C.emerald}, ${C.violet})`, marginBottom: 20 }} />
            <button style={{
              width: "100%", padding: "12px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.forest}, ${C.mint})`,
              color: "#fff", fontFamily: "'Unbounded',sans-serif", fontSize: 12, fontWeight: 660,
              cursor: "pointer", boxShadow: "0 3px 12px rgba(20,140,89,0.2)",
            }}>
              Exit Pulse
            </button>
            <p style={{ fontSize: 10, color: C.textDim, marginTop: 10, marginBottom: 0, fontFamily: "'Space Grotesk',sans-serif" }}>
              Pulse will remove itself automatically.
            </p>
          </div>
          <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(0,0,0,0.04)", textAlign: "center" }}>
            <span style={{ fontSize: 9, color: C.textDim, fontFamily: "'Space Grotesk',sans-serif" }}>Powered by UXpact Pulse</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── EXPANDED STATE ───
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, width: 340 }}>
      <div style={{
        borderRadius: 16,
        background: "rgba(255,255,255,0.7)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.6)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.7)",
        overflow: "hidden", display: "flex", flexDirection: "column",
        maxHeight: "80vh",
      }}>
        {/* Header — icon + title + audit ID on left, minimise button on right */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PulseIcon />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, fontFamily: "'Unbounded',sans-serif" }}>UXpact Pulse</div>
              <div style={{ fontSize: 10, color: C.textDim, fontFamily: "'Space Grotesk',sans-serif" }}>Audit #0024</div>
            </div>
          </div>
          {/* Minimise only */}
          <div onClick={() => setExpanded(false)} style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(0,0,0,0.04)", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>

        {/* Progress */}
        <div style={{ padding: "12px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.navy, fontFamily: "'Space Grotesk',sans-serif" }}>Progress</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.violet, fontFamily: "'Space Grotesk',sans-serif" }}>{done}/{total}</span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 3,
              background: `linear-gradient(90deg, ${C.emerald}, ${C.violet})`,
              width: `${pct}%`, transition: "width 0.3s ease",
              boxShadow: "0 0 8px rgba(91,97,244,0.25)",
            }} />
          </div>
        </div>

        {/* Checklist — scrollable */}
        <div style={{ overflowY: "auto", flex: 1, padding: "0 16px 12px" }}>
          {sevGroups.map(([sev, items], gi) => (
            <div key={sev}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, margin: gi === 0 ? "0 0 8px" : "14px 0 8px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: sevColor[sev], textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Space Grotesk',sans-serif" }}>{items[0].emoji} {sev}</span>
                <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.04)" }} />
              </div>
              {items.map((item) => {
                const checked = checks[item.idx];
                return (
                  <div key={item.idx} style={{
                    display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0",
                  }}>
                    <VioletCheck checked={checked} onClick={() => toggle(item.idx)} />
                    <span style={{
                      fontSize: 12, color: checked ? C.textDim : C.navy, lineHeight: 1.4,
                      textDecoration: checked ? "line-through" : "none",
                      opacity: checked ? 0.5 : 1, transition: "opacity 0.2s, color 0.2s",
                      fontFamily: "'Space Grotesk',sans-serif", fontWeight: 450, cursor: "pointer",
                    }} onClick={() => toggle(item.idx)}>{item.text}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(0,0,0,0.04)", textAlign: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: C.textDim, fontFamily: "'Space Grotesk',sans-serif" }}>
            Auto-removes when all items checked · Powered by UXpact
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── DEMO PAGE — provides background so glassmorphic effect is visible ───
export default function PulseDemo() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Space Grotesk',sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", top: -100, left: -60, width: 480, height: 480, background: "radial-gradient(circle, rgba(20,213,113,0.12) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: 400, right: -80, width: 380, height: 380, background: "radial-gradient(circle, rgba(91,97,244,0.08) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -60, left: "40%", width: 400, height: 350, background: "radial-gradient(circle, rgba(20,140,89,0.08) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

      <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Simulated page content behind the widget */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "60px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#186132,#14D571)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" /></svg>
          </div>
          <span style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 16, fontWeight: 700, color: C.navy }}>UXpact Pulse Demo</span>
        </div>

        <div style={{ padding: "40px 32px", borderRadius: 16, background: "rgba(255,255,255,0.5)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.65)", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <h2 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 20, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>
            This simulates your website
          </h2>
          <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, margin: "0 0 20px" }}>
            The Pulse widget appears as a bottom-right overlay on the user's actual website after they install the browser extension and enter their Audit ID.
          </p>
          <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, margin: "0 0 20px" }}>
            Try checking off items in the widget. When all items are done, the completion state appears. Click the chevron to minimise into a floating pill.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ padding: "4px 11px", borderRadius: 5, background: "#D1FAE5", fontSize: 11.5, fontWeight: 600, color: C.navy }}>Browser extension</span>
            <span style={{ padding: "4px 11px", borderRadius: 5, background: "#E0E7FF", fontSize: 11.5, fontWeight: 600, color: C.navy }}>Chrome · Safari · Edge · Firefox</span>
          </div>
        </div>

        <div style={{ marginTop: 24, padding: "24px 32px", borderRadius: 16, background: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.5)" }}>
          <p style={{ fontSize: 13, color: C.textDim, margin: 0, lineHeight: 1.6 }}>
            Scroll down or interact with the widget in the bottom-right corner. The glassmorphic effect is visible because the page has coloured gradient blobs behind it — on a real website, the user's own page content would show through.
          </p>
        </div>
      </div>

      {/* The actual Pulse widget */}
      <PulseWidgetInner />
    </div>
  );
}
