import { useEffect, useState } from "react";
import { color, font, glass, gradient, radius } from "../theme";
import type { Diagnosis } from "../lib/types";
import { JOURNEY_STAGE_LABEL, JOURNEY_STAGE_ORDER } from "../lib/types";

const STATUS_MESSAGES = [
  "Reading the page like a real visitor…",
  "Mapping the journey from arrival to action…",
  "Checking where trust actually gets built…",
  "Weighing the story against the goal…",
  "Estimating what this is costing you…",
];

// The visitor's path through a page is a connected system, not a checklist —
// this reads as UXpact tracing that system rather than scanning line by line.
const NODES: [number, number][] = [
  [26, 132], [64, 54], [104, 176], [140, 34], [166, 128],
  [204, 78], [222, 190], [252, 46], [76, 222], [188, 224],
];
const EDGES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 8], [3, 5], [4, 5],
  [4, 6], [5, 7], [5, 6], [6, 9], [8, 9], [4, 9], [3, 7],
];
const SIGNAL_EDGES = [1, 4, 8, 11];
const NODE_COLORS = ["#14D571", "#5B61F4", "#186132", "#0B1C48"];

function NodeWeb() {
  return (
    <div style={{ width: 280, height: 250, borderRadius: radius.lg, border: "1px solid rgba(11,28,72,0.08)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @keyframes nodePulse { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.4); } }
        @keyframes travelSignal { to { stroke-dashoffset: -420; } }
      `}</style>
      <svg viewBox="0 0 280 250" width={252} height={225}>
        {EDGES.map(([a, b], i) => (
          <line key={i} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} stroke="rgba(11,28,72,0.12)" strokeWidth={1} />
        ))}
        {SIGNAL_EDGES.map((ei, i) => {
          const [a, b] = EDGES[ei];
          return (
            <line
              key={`signal-${ei}`}
              x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]}
              stroke="#14D571" strokeWidth={2} strokeLinecap="round" strokeDasharray="8 60"
              style={{ animation: "travelSignal 2.4s linear infinite", animationDelay: `${i * 0.45}s` }}
            />
          );
        })}
        {NODES.map(([x, y], i) => (
          <circle
            key={i} cx={x} cy={y} r={i % 3 === 0 ? 5 : 3.5} fill={NODE_COLORS[i % NODE_COLORS.length]}
            style={{ transformOrigin: `${x}px ${y}px`, animation: "nodePulse 2.2s ease-in-out infinite", animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </svg>
    </div>
  );
}

export default function ScanningView({ url, diagnosis, onEnter }: { url: string; diagnosis: Diagnosis | null; onEnter: () => void }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const domain = (() => { try { return new URL(url).hostname; } catch { return url; } })();

  useEffect(() => {
    const interval = setInterval(() => setMsgIndex((i) => (i + 1) % STATUS_MESSAGES.length), 1900);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (diagnosis) {
      const t = setTimeout(() => setRevealed(true), 300);
      return () => clearTimeout(t);
    }
  }, [diagnosis]);

  const showResult = diagnosis && revealed;
  const stagesWithBreaks = new Set((diagnosis?.journeyBreaks ?? []).map((b) => b.journeyStage));

  return (
    <div style={{ minHeight: "100vh", background: color.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <p style={{ fontFamily: font.body, fontSize: 12, fontWeight: 700, color: color.forest, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{domain}</p>

        {!showResult ? (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}><NodeWeb /></div>
            <p style={{ fontFamily: font.body, fontSize: 13.5, color: color.muted, minHeight: 20, transition: "opacity 0.3s" }}>{STATUS_MESSAGES[msgIndex]}</p>
          </>
        ) : (
          <div className="reveal in-view" style={{ animation: "upIn 0.5s cubic-bezier(0.16,1,0.3,1) both" }}>
            {diagnosis.narrativeVerdict ? (
              <div style={{ borderRadius: radius.lg, padding: "22px 24px", background: gradient.brand, marginBottom: 18, textAlign: "left" }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.65)", marginBottom: 8, fontFamily: font.body }}>The verdict</div>
                <p style={{ fontFamily: font.body, fontSize: 14.5, fontWeight: 600, color: "#fff", lineHeight: 1.55, margin: 0 }}>{diagnosis.narrativeVerdict}</p>
              </div>
            ) : (
              <div style={{ borderRadius: radius.lg, padding: "18px 20px", background: "rgba(179,38,30,0.06)", border: "1px solid rgba(179,38,30,0.15)", marginBottom: 18, textAlign: "left" }}>
                <p style={{ fontFamily: font.body, fontSize: 13, color: "#8a1f19", margin: 0, lineHeight: 1.55 }}>{diagnosis.diagnosisError ?? "The diagnosis didn't complete for this run."}</p>
              </div>
            )}

            {diagnosis.journeyBreaks && diagnosis.journeyBreaks.length > 0 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 18 }}>
                {JOURNEY_STAGE_ORDER.map((stage) => (
                  <div key={stage} style={{ width: 8, height: 8, borderRadius: "50%", background: stagesWithBreaks.has(stage) ? color.violet : "rgba(11,28,72,0.12)" }} title={JOURNEY_STAGE_LABEL[stage]} />
                ))}
              </div>
            )}

            {diagnosis.revenueLeakEstimate && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontFamily: font.display, fontSize: 26, fontWeight: 700, color: color.navy }}>{diagnosis.revenueLeakEstimate}</div>
                <div style={{ fontFamily: font.body, fontSize: 11.5, color: color.muted }}>estimated at risk</div>
              </div>
            )}

            <button onClick={onEnter} style={{
              width: "100%", padding: "15px 0", borderRadius: radius.md, border: "none", cursor: "pointer",
              background: gradient.brand, color: "#fff", fontFamily: font.display, fontSize: 14, fontWeight: 700,
              boxShadow: "0 6px 20px rgba(20,140,89,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              Open your workspace
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-7-7l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
