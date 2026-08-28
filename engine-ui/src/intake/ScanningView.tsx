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

function ScanLine() {
  return (
    <div style={{ position: "relative", width: 280, borderRadius: radius.lg, overflow: "hidden", border: "1px solid rgba(11,28,72,0.08)", background: "#fff" }}>
      <style>{`
        @keyframes sweep { 0% { transform: translateY(-100%); } 100% { transform: translateY(340px); } }
        @keyframes blockPulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.7; } }
      `}</style>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ height: 8, width: "40%", borderRadius: 4, background: "rgba(11,28,72,0.12)", animation: "blockPulse 2.2s ease-in-out infinite" }} />
        <div style={{ height: 22, width: "80%", borderRadius: 4, background: "rgba(11,28,72,0.15)", animation: "blockPulse 2.2s ease-in-out 0.1s infinite" }} />
        <div style={{ height: 22, width: "60%", borderRadius: 4, background: "rgba(11,28,72,0.15)", animation: "blockPulse 2.2s ease-in-out 0.15s infinite" }} />
        <div style={{ height: 30, marginTop: 6 }} />
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ flex: 1, height: 46, borderRadius: 6, background: "rgba(11,28,72,0.08)", animation: `blockPulse 2.2s ease-in-out ${i * 0.12}s infinite` }} />)}
        </div>
        <div style={{ height: 36, width: "100%", borderRadius: 8, background: "rgba(20,213,113,0.18)", marginTop: 10, animation: "blockPulse 2.2s ease-in-out 0.3s infinite" }} />
      </div>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 60, background: "linear-gradient(180deg, rgba(20,213,113,0.35), transparent)", animation: "sweep 2.6s linear infinite" }} />
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
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}><ScanLine /></div>
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
