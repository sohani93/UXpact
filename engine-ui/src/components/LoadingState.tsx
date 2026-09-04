import { useEffect, useRef, useState } from "react";
import Nav from "./Nav";
import SignalGrid from "./SignalGrid";
import type { AuditData } from "../lib/ui-types";

const STATUS_MSGS = [
  "Mapping conversion pathways...",
  "Scanning above-the-fold signals...",
  "Cross-referencing industry benchmarks...",
  "Measuring cognitive load patterns...",
  "Evaluating persuasion architecture...",
  "Detecting friction points...",
  "Parsing trust signal density...",
  "Analysing content-to-intent alignment...",
];

type LoadingStateProps = {
  auditData: AuditData | null;
  onAccess: () => void;
};

// The real processing-wait screen for the submit -> Diagnosis flow. Visual
// centerpiece is a full-bleed animated dot field (SignalGrid), not boxed —
// heading and status line are the only things carried over from the
// previous version of this screen.
export default function LoadingState({ auditData, onAccess }: LoadingStateProps) {
  const [lblIdx, setLblIdx] = useState(0);
  const [lblOp, setLblOp] = useState(1);
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (auditData !== null && !navigatedRef.current) {
      navigatedRef.current = true;
      onAccess();
    }
  }, [auditData, onAccess]);

  useEffect(() => {
    const i = setInterval(() => {
      setLblOp(0);
      setTimeout(() => { setLblIdx((p) => (p + 1) % STATUS_MSGS.length); setLblOp(1); }, 300);
    }, 1800);
    return () => clearInterval(i);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#060509", position: "relative", overflow: "hidden" }}>
      <SignalGrid />
      <Nav />
      <div style={{ position: "relative", zIndex: 10, maxWidth: 1060, margin: "0 auto", padding: "90px 28px 0" }}>
        <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 26, fontWeight: 700, color: "#F3F1FA", letterSpacing: "-0.5px", margin: "0 0 6px" }}>
          Scanning <span style={{ background: "linear-gradient(90deg,#1F8C4C,#14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Your Site</span>
        </h1>
        <p style={{ fontSize: 14, color: "#B7B2CC", margin: 0 }}>We're deep-diving into your site right now.</p>
      </div>
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 70, zIndex: 10, textAlign: "center" }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: "#14D571", opacity: lblOp, transition: "opacity 0.3s ease", fontFamily: "'Space Grotesk',sans-serif" }}>
          {STATUS_MSGS[lblIdx]}
        </div>
      </div>
    </div>
  );
}
