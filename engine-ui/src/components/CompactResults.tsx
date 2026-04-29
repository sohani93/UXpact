// @ts-nocheck
import { useState } from "react";
import ArcGauge from "./ArcGauge";
import type { Finding } from "../lib/ui-types";

const C = { navy: "#0B1C48", forest: "#186132", mint: "#14D571", muted: "#6B7280", dim: "#9CA3AF" };

const SEV_DOT: Record<string, string> = {
  critical: "#EF4444",
  major: "#F59E0B",
  minor: "#EAB308",
};

type CompactResultsProps = {
  score: number;
  topFindings: Finding[];
  mobileDropoff: number;
  atRisk: string;
  onAccess: () => void;
  animated?: boolean;
};

export default function CompactResults({ score, topFindings, mobileDropoff, atRisk, onAccess, animated = true }: CompactResultsProps) {
  const [hovCTA, setHovCTA] = useState(false);
  const top = topFindings.slice(0, 3);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div className="fade-up" style={{ animationDelay: "0s" }}>
        <ArcGauge score={score} animated={animated} />
      </div>

      {/* Top findings teaser */}
      <div className="fade-up" style={{ animationDelay: "0.25s", width: "100%", maxWidth: 520 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Top Findings</div>
        {top.map((f, i) => (
          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.04)", marginBottom: 6, animation: `fadeUp 0.3s ease ${0.35 + i * 0.1}s both` }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: SEV_DOT[f.severity] ?? "#9CA3AF", flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: C.navy }}>{f.name}</span>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: SEV_DOT[f.severity] ?? "#9CA3AF", flexShrink: 0 }}>{f.severity}</span>
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div className="fade-up" style={{ animationDelay: "0.5s", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, width: "100%", maxWidth: 420, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.65)", background: "rgba(255,255,255,0.5)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
        <div style={{ padding: "16px 18px", borderRight: "1px solid rgba(0,0,0,0.05)", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.forest, fontFamily: "'Unbounded',sans-serif", marginBottom: 3 }}>~{mobileDropoff}%</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: C.muted }}>mobile drop-off</div>
        </div>
        <div style={{ padding: "16px 18px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 3 }}>
            <span style={{ fontSize: 15 }}>⚠️</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: C.navy, fontFamily: "'Unbounded',sans-serif" }}>~{atRisk}</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 500, color: C.muted }}>at risk</div>
        </div>
      </div>

      {/* CTA */}
      <div className="fade-up" style={{ animationDelay: "0.65s", width: "100%", maxWidth: 420 }}>
        <button
          onMouseEnter={() => setHovCTA(true)}
          onMouseLeave={() => setHovCTA(false)}
          onClick={onAccess}
          style={{ width: "100%", padding: "14px 40px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "'Unbounded',sans-serif", fontSize: 14, fontWeight: 660, color: "#fff", background: hovCTA ? "linear-gradient(135deg,#5B61F4,#7B7FFF)" : "linear-gradient(135deg,#186132,#14D571)", boxShadow: hovCTA ? "0 4px 20px rgba(91,97,244,0.35)" : "0 3px 12px rgba(20,140,89,0.2)", transition: "all 0.3s ease", transform: hovCTA ? "translateY(-1px)" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          Access Full Report
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-7-7l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}
