import { useState } from "react";
import type { JourneyBreak, JourneyStage } from "../lib/ui-types";

const C = { navy: "#F3F1FA", forest: "#1F8C4C", mint: "#14D571", violet: "#7B7FFF", muted: "#B7B2CC", dim: "#79749A" };

const JOURNEY_STAGE_LABELS: Record<JourneyStage, string> = {
  arrival: "Arrival",
  understanding: "Understanding",
  "trust-building": "Trust",
  decision: "Decision",
  action: "Action",
};
const JOURNEY_STAGE_ORDER: JourneyStage[] = ["arrival", "understanding", "trust-building", "decision", "action"];

function JourneyStrip({ journeyBreaks }: { journeyBreaks: JourneyBreak[] }) {
  const stagesWithBreaks = new Set(journeyBreaks.map((jb) => jb.journeyStage));
  return (
    <div className="fade-up" style={{ animationDelay: "0.1s", width: "100%", maxWidth: 520 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {JOURNEY_STAGE_ORDER.map((stage, i) => {
          const broken = stagesWithBreaks.has(stage);
          return (
            <div key={stage} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: broken ? 10 : 7, height: broken ? 10 : 7, borderRadius: "50%", background: broken ? C.violet : "rgba(255,255,255,0.14)", transition: "all 0.2s" }} />
                <span style={{ fontSize: 9, fontWeight: broken ? 700 : 500, color: broken ? C.violet : C.dim, whiteSpace: "nowrap" }}>{JOURNEY_STAGE_LABELS[stage]}</span>
              </div>
              {i < JOURNEY_STAGE_ORDER.length - 1 && <div style={{ width: 14, height: 1, background: "rgba(255,255,255,0.09)" }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type CompactResultsProps = {
  narrativeVerdict: string | null;
  revenueLeakEstimate: string | null;
  journeyBreaks: JourneyBreak[] | null;
  diagnosisError: string | null;
  onAccess: () => void;
  animated?: boolean;
};

export default function CompactResults({ narrativeVerdict, revenueLeakEstimate, journeyBreaks, diagnosisError, onAccess, animated = true }: CompactResultsProps) {
  const [hovCTA, setHovCTA] = useState(false);
  const breaks = journeyBreaks ?? [];

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      {narrativeVerdict ? (
        <div className="fade-up" style={{ animationDelay: "0s", width: "100%", maxWidth: 520, borderRadius: 12, padding: "20px 24px", background: "linear-gradient(135deg,#186132 0%,#148C59 60%,#14D571 100%)" }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>What actually happens on your site</div>
          <p style={{ fontSize: 14.5, fontWeight: 600, color: "#fff", lineHeight: 1.6, margin: 0 }}>{narrativeVerdict}</p>
        </div>
      ) : (
        <div className="fade-up" style={{ animationDelay: "0s", width: "100%", maxWidth: 520, borderRadius: 12, padding: "16px 20px", background: "rgba(217,86,76,0.1)", border: "1px solid rgba(217,86,76,0.3)" }}>
          <p style={{ fontSize: 13, color: "#FF9B90", lineHeight: 1.5, margin: 0 }}>{diagnosisError ?? "Diagnosis unavailable for this run."}</p>
        </div>
      )}

      {breaks.length > 0 && <JourneyStrip journeyBreaks={breaks} />}

      {revenueLeakEstimate && (
        <div className="fade-up" style={{ animationDelay: "0.25s", textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.navy, fontFamily: "'Unbounded',sans-serif", marginBottom: 2 }}>{revenueLeakEstimate}</div>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: C.muted }}>estimated at risk</div>
        </div>
      )}

      {breaks.length > 0 && (
        <div className="fade-up" style={{ animationDelay: "0.35s", width: "100%", maxWidth: 520 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Where the journey breaks down</div>
          {breaks.slice(0, 3).map((jb, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.09)", marginBottom: 6, animation: `fadeUp 0.3s ease ${0.4 + i * 0.1}s both` }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.violet, marginTop: 4, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.violet }}>{JOURNEY_STAGE_LABELS[jb.journeyStage]}</span>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: C.navy, marginTop: 2 }}>{jb.element}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="fade-up" style={{ animationDelay: "0.5s", width: "100%", maxWidth: 420 }}>
        <button
          onMouseEnter={() => setHovCTA(true)}
          onMouseLeave={() => setHovCTA(false)}
          onClick={onAccess}
          style={{ width: "100%", padding: "14px 40px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "'Unbounded',sans-serif", fontSize: 14, fontWeight: 660, color: "#fff", background: hovCTA ? "linear-gradient(135deg,#5B61F4,#7B7FFF)" : "linear-gradient(135deg,#186132,#14D571)", boxShadow: hovCTA ? "0 4px 20px rgba(91,97,244,0.35)" : "0 3px 12px rgba(20,140,89,0.2)", transition: "all 0.3s ease", transform: hovCTA ? "translateY(-1px)" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          Open Your Workspace
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-7-7l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}
