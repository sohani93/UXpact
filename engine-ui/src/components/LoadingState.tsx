// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import Nav from "./Nav";
import Blobs from "./Blobs";
import NodeMap from "./NodeMap";
import Pill from "./Pill";
import type { AuditData } from "../lib/ui-types";

const C = { bg: "#060509", forest: "#1F8C4C", mint: "#14D571", emerald: "#14D571", navy: "#F3F1FA", muted: "#B7B2CC", dim: "#79749A" };

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

const glass = {
  background: "rgba(255,255,255,0.045)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.09)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)",
};

const KEYFRAMES = `
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.fade-up{animation:fadeUp 0.4s ease both}
.fade-in{animation:fadeIn 0.4s ease both}
`;

type LoadingStateProps = {
  url: string;
  goals: string[];
  auditData: AuditData | null;
  onAccess: () => void;
  onError?: () => void;
};

// Pure processing-wait screen: shows the scan animation for as long as the
// real run-audit call takes, then goes straight into the workspace once the
// real result lands — no separate "compact preview" step to click through.
// Spec v3's single continuous workspace has one destination for the
// diagnosis (the real Diagnosis page), not a preview-then-unlock gate.
export default function LoadingState({ url, goals, auditData, onAccess, onError }: LoadingStateProps) {
  const [phase, setPhase] = useState<"scan" | "burst">("scan");
  const [scanDone, setScanDone] = useState(false);
  const [lblIdx, setLblIdx] = useState(0);
  const [lblOp, setLblOp] = useState(1);
  const [hangTight, setHangTight] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);
  const navigatedRef = useRef(false);

  const displayDomain = (() => { try { return new URL(url).hostname; } catch { return url; } })();

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("burst"), 8000);
    const t2 = setTimeout(() => setScanDone(true), 8900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Real result ready (backend resolved) and the minimum scan floor has
  // played out — go straight into the workspace. Guarded so it only ever
  // fires once even if this effect re-runs.
  useEffect(() => {
    if (scanDone && auditData !== null && !navigatedRef.current) {
      navigatedRef.current = true;
      onAccess();
    }
  }, [scanDone, auditData, onAccess]);

  useEffect(() => {
    const t = setTimeout(() => setHangTight(true), 6000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const i = setInterval(() => {
      setLblOp(0);
      setTimeout(() => { setLblIdx(p => (p + 1) % STATUS_MSGS.length); setLblOp(1); }, 300);
    }, 1800);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const p = Math.min((Date.now() - start) / 8000, 1);
      bar.style.width = (1 - Math.pow(1 - p, 2.5)) * 100 + "%";
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const displayGoals = goals.slice(0, 5);

  return (
    <div className="fade-in" style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Space Grotesk',sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{KEYFRAMES}</style>
      <Blobs />
      <Nav onNew={onError} />
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "8px 28px 60px", position: "relative", zIndex: 10 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 26, fontWeight: 700, color: C.navy, letterSpacing: "-0.5px", margin: "0 0 6px" }}>
            Scanning <span style={{ background: "linear-gradient(90deg,#186132,#14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Your Site</span>
          </h1>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>We're deep-diving into your site right now.</p>
        </div>

        <div style={{ ...glass, padding: "36px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            <Pill text={displayDomain} v="green" />
            {displayGoals.map((g, i) => (
              <Pill key={i} text={g} v={i % 2 === 0 ? "green" : "violet"} />
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, opacity: phase === "burst" ? 0 : 1, transition: "opacity 0.4s ease" }}>
            <div style={{ width: 320, height: 320 }}>
              <NodeMap burst={phase === "burst"} />
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: C.emerald, opacity: lblOp, transition: "opacity 0.3s ease", minHeight: 18, textAlign: "center" }}>
              {STATUS_MSGS[lblIdx]}
            </div>
            <div style={{ width: "100%", maxWidth: 260, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.09)", overflow: "hidden", margin: "0 auto" }}>
              <div ref={barRef} style={{ height: "100%", borderRadius: 2, width: "0%", background: `linear-gradient(90deg,${C.forest},${C.mint})`, boxShadow: "0 0 6px rgba(20,213,113,0.25)" }} />
            </div>
            <div style={{ fontSize: 11, color: C.dim, opacity: hangTight ? 1 : 0, transition: "opacity 0.8s ease", marginTop: 4, textAlign: "center" }}>
              Hang tight — almost there
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
