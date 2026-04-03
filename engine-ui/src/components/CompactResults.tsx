// @ts-nocheck
import { useState } from "react";
import type { Finding, RevenueLeak } from "../lib/ui-types";

type CompactResultsProps = {
  auditId: string;
  score: number;
  scoreLabel: string;
  scoreSummary: string;
  findings: Finding[];
  topFindings: Finding[];
  criticalIssues: number;
  revenueLeak: RevenueLeak;
  domain: string;
  focusAreas: string[];
};

const C = { bg: "#EEF1F5", forest: "#186132", emerald: "#148C59", mint: "#14D571", navy: "#0B1C48", textMuted: "#6B7280", textDim: "#9CA3AF", violet: "#5B61F4" };
const glass = { background: "rgba(255,255,255,0.5)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.65)", boxShadow: "0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.7)" };
const sevDot = { critical: "#DC2626", major: "#F59E0B", minor: C.emerald };

function Pill({ text, variant }: { text: string; variant: "green" | "violet" }) {
  const base = {
    padding: "5px 14px",
    borderRadius: 6,
    border: "none",
    fontSize: 12.5,
    whiteSpace: "nowrap" as const,
    cursor: "default",
    fontFamily: "'Space Grotesk', sans-serif",
  };

  if (variant === "green") {
    return <div style={{ ...base, background: "#D1FAE5", color: "#0B1C48", fontWeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>{text}</div>;
  }

  return <div style={{ ...base, background: "#E0E7FF", color: "#0B1C48", fontWeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>{text}</div>;
}

function ArcGauge({ score }: { score: number }) {
  const r = 90, sw = 9, cx = 110, cy = 112;
  const pol = (rad: number, a: number) => ({ x: cx + rad * Math.cos((a * Math.PI) / 180), y: cy + rad * Math.sin((a * Math.PI) / 180) });
  const s = pol(r, 180), e = pol(r, 360);
  const bgArc = `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`;
  const arcLen = Math.PI * r;
  const frac = score / 100;
  const dot = pol(r, 180 + 180 * frac);

  return (
    <svg width={220} height={135} viewBox="0 0 220 135">
      <path d={bgArc} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={sw} strokeLinecap="round" />
      <path d={bgArc} fill="none" stroke="url(#ag)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={arcLen} strokeDashoffset={arcLen * (1 - frac)} />
      <defs>
        <linearGradient id="ag" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor={C.forest} />
          <stop offset="100%" stopColor={C.mint} />
        </linearGradient>
      </defs>
      <circle cx={dot.x} cy={dot.y} r={5} fill={C.emerald} />
      <text x={cx} y={cy - 10} textAnchor="middle" style={{ fontSize: 48, fontWeight: 800, fill: C.emerald, fontFamily: "'Unbounded',sans-serif", letterSpacing: "-2px" }}>{Math.round(score)}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontSize: 10, fontWeight: 600, fill: C.textDim, letterSpacing: 2.5, textTransform: "uppercase", fontFamily: "'Space Grotesk',sans-serif" }}>UX Score</text>
    </svg>
  );
}

export default function CompactResults({ auditId, score, scoreLabel, scoreSummary, findings, topFindings, criticalIssues, revenueLeak, domain, focusAreas }: CompactResultsProps) {
  const [hov, setHov] = useState(false);
  const top = topFindings.slice(0, 3);

  const criticalCount = criticalIssues;
  const assessmentText =
    score < 40
      ? `Your site has ${criticalCount} critical issue${criticalCount === 1 ? "" : "s"} costing you conversions.`
      : score < 70
        ? `You're leaving conversions on the table — ${criticalCount} critical fix${criticalCount === 1 ? "" : "es"} could change everything.`
        : `Strong foundation. ${criticalCount > 0 ? `${criticalCount} refinement(s)` : "A few tweaks"} will push you further.`;

  let dropoff = 35;
  if (findings.some((f) => f.check_id === "A1.4" && !f.pass)) dropoff += 12;
  if (findings.some((f) => f.check_id === "A5.2" && !f.pass)) dropoff += 8;
  if (findings.some((f) => f.check_id === "A1.6" && !f.pass)) dropoff += 8;
  if (findings.some((f) => f.check_id === "A3.2" && !f.pass)) dropoff += 5;
  dropoff = Math.min(65, dropoff);
  dropoff = Math.round(dropoff / 5) * 5;

  let atRisk = "£480/mo";
  if (score < 40 && criticalCount >= 3) atRisk = "£5,200/mo";
  else if (score < 60 && criticalCount >= 2) atRisk = "£2,800/mo";
  else if (score < 70 && criticalCount >= 1) atRisk = "£1,100/mo";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Space Grotesk',sans-serif", position: "relative", overflow: "hidden" }}>
      <nav style={{ maxWidth: 1120, margin: "0 auto", padding: "16px 28px" }}><span style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 16, fontWeight: 700, color: "#0B1C48" }}>UXpact</span></nav>
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "8px 28px 60px", position: "relative", zIndex: 10 }}>
        <div style={{ marginBottom: 24 }}><h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 26, fontWeight: 700, color: "#0B1C48" }}>Your <span style={{ background: "linear-gradient(90deg,#186132,#14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>UXpact</span></h1></div>
        <div style={{ ...glass, padding: "36px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            <Pill text={domain} variant="green" />
            {focusAreas.map((area, idx) => (
              <Pill key={`${area}-${idx}`} text={area} variant={idx === 0 ? "green" : "violet"} />
            ))}
          </div>

          <ArcGauge score={score} />
          <p style={{ fontSize: 14, fontWeight: 500, color: "#0B1C48", textAlign: "center", maxWidth: 440, margin: 0 }}>{assessmentText}</p>
          <div style={{ marginTop: -2, padding: "4px 16px", borderRadius: 20, background: scoreLabel === "Critical" ? "#FEE2E2" : "#E0E7FF", fontSize: 11, fontWeight: 600, color: scoreLabel === "Critical" ? "#DC2626" : "#5B61F4" }}>{scoreLabel}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, width: "100%", maxWidth: 420, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.65)", background: "rgba(255,255,255,0.5)" }}>
            <div style={{ padding: "16px 18px", borderRight: "1px solid rgba(0,0,0,0.05)", textAlign: "center" }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#186132", fontFamily: "'Unbounded', sans-serif" }}>🔻 ~{dropoff}%</span>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#6B7280" }}>mobile drop-off</div>
            </div>
            <div style={{ padding: "16px 18px", textAlign: "center" }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#0B1C48", fontFamily: "'Unbounded', sans-serif" }}>⚠️ ~{atRisk}</span>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#6B7280" }}>at risk</div>
            </div>
          </div>
          <div style={{ width: "100%" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Top Findings</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {top.map((f, i) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.04)", opacity: 1, transform: "translateY(0)", transition: `opacity 0.3s ease ${0.3 + i * 0.15}s` }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: sevDot[f.severity], flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: C.navy }}>{f.name}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: sevDot[f.severity] }}>{f.severity.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
          <button onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={() => { window.history.pushState({}, "", `/report/${auditId}`); window.dispatchEvent(new PopStateEvent("popstate")); }} style={{ padding: "14px 40px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "'Unbounded',sans-serif", fontSize: 14, fontWeight: 660, color: "#fff", background: hov ? `linear-gradient(135deg, ${C.violet}, #7B7FFF)` : `linear-gradient(135deg, ${C.forest}, ${C.mint})` }}>Access Full Report →</button>
        </div>
      </div>
    </div>
  );
}
