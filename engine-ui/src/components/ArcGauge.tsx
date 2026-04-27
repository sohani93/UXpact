import { useState, useEffect } from "react";

const getScoreColor = (s: number) => s >= 70 ? "#14D571" : s >= 40 ? "#148C59" : "#186132";
const getSevBadge = (s: number) =>
  s >= 70
    ? { label: "Good", bg: "#D1FAE5", color: "#148C59" }
    : s >= 40
      ? { label: "Needs Work", bg: "#E0E7FF", color: "#5B61F4" }
      : { label: "Critical", bg: "#FEE2E2", color: "#DC2626" };

type ArcGaugeProps = {
  score?: number;
  animated?: boolean;
  size?: "normal" | "big";
};

export default function ArcGauge({ score = 61, animated = true, size = "normal" }: ArcGaugeProps) {
  const big = size === "big";
  const r = big ? 130 : 90, sw = big ? 11 : 9, cx = big ? 160 : 110, cy = big ? 162 : 112;
  const svgW = big ? 320 : 220, svgH = big ? 195 : 135;
  const pol = (rad: number, a: number) => ({ x: cx + rad * Math.cos(a * Math.PI / 180), y: cy + rad * Math.sin(a * Math.PI / 180) });
  const s = pol(r, 180), e = pol(r, 360);
  const bgArc = `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`;
  const arcLen = Math.PI * r;
  const targetFrac = score / 100;
  const [frac, setFrac] = useState(animated ? 0 : targetFrac);
  const [num, setNum] = useState(animated ? 0 : score);
  const [dotV, setDotV] = useState(!animated);
  const sc = getScoreColor(score), sev = getSevBadge(score);
  const dot = pol(r, 180 + 180 * frac);

  useEffect(() => {
    if (!animated) return;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / 1400, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setFrac(ease * targetFrac);
      setNum(Math.round(ease * score));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const dt = setTimeout(() => setDotV(true), 1650);
    return () => clearTimeout(dt);
  }, [animated, score]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        <defs>
          <linearGradient id={`ag-${size}`} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#186132"/><stop offset="50%" stopColor="#148C59"/><stop offset="100%" stopColor="#14D571"/>
          </linearGradient>
          <filter id="glo"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <path d={bgArc} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={sw} strokeLinecap="round"/>
        <path d={bgArc} fill="none" stroke={`url(#ag-${size})`} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={arcLen} strokeDashoffset={arcLen * (1 - frac)}/>
        {dotV && frac > 0 && <circle cx={dot.x} cy={dot.y} r={big ? 6 : 5} fill={sc} filter="url(#glo)"/>}
        <text x={cx} y={cy - (big ? 14 : 10)} textAnchor="middle"
          style={{ fontSize: big ? 56 : 48, fontWeight: 800, fill: sc, fontFamily: "'Unbounded',sans-serif", letterSpacing: "-2px" }}>
          {num}
        </text>
        <text x={cx} y={cy + (big ? 14 : 12)} textAnchor="middle"
          style={{ fontSize: big ? 11 : 10, fontWeight: 600, fill: "#9CA3AF", letterSpacing: 2.5, textTransform: "uppercase", fontFamily: "'Space Grotesk',sans-serif" }}>
          UX Score
        </text>
      </svg>
      <div style={{ marginTop: -2, padding: "4px 16px", borderRadius: 20, background: sev.bg, fontSize: 11, fontWeight: 600, color: sev.color, fontFamily: "'Space Grotesk',sans-serif", transition: "background 0.4s ease,color 0.4s ease" }}>
        {sev.label}
      </div>
    </div>
  );
}
