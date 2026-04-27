// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import Nav from "./Nav";
import Blobs from "./Blobs";
import NodeMap from "./NodeMap";
import Pill from "./Pill";
import CompactResults from "./CompactResults";
import type { AuditData } from "../lib/ui-types";

const C = { bg: "#EEF1F5", forest: "#186132", mint: "#14D571", emerald: "#148C59", navy: "#0B1C48", muted: "#6B7280", dim: "#9CA3AF" };

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
  background: "rgba(255,255,255,0.5)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.65)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.7)",
};

const KEYFRAMES = `
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.fade-up{animation:fadeUp 0.4s ease both}
.fade-in{animation:fadeIn 0.4s ease both}
`;

function getMobileDropoff(findings: any[]): number {
  let v = 35;
  const titles = findings.map(f => `${f.name} ${f.finding}`.toLowerCase());
  if (titles.some(t => t.includes("above fold") || t.includes("cta"))) v += 12;
  if (titles.some(t => t.includes("viewport"))) v += 8;
  if (titles.some(t => t.includes("spacing") || t.includes("layout"))) v += 5;
  return Math.min(65, Math.round(v / 5) * 5);
}

function getAtRisk(score: number, criticalIssues: number): string {
  if (score < 40 && criticalIssues > 2) return "£5,200/mo";
  if (score < 40) return "£2,800/mo";
  if (score < 60) return "£1,100/mo";
  return "£480/mo";
}

type LoadingStateProps = {
  url: string;
  goals: string[];
  auditData: AuditData | null;
  onAccess: () => void;
  onError?: () => void;
};

export default function LoadingState({ url, goals, auditData, onAccess, onError }: LoadingStateProps) {
  const [phase, setPhase] = useState<"scan" | "burst" | "result">("scan");
  const [scanDone, setScanDone] = useState(false);
  const [anim, setAnim] = useState(false);
  const [lblIdx, setLblIdx] = useState(0);
  const [lblOp, setLblOp] = useState(1);
  const [hangTight, setHangTight] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);

  const displayDomain = (() => { try { return new URL(url).hostname; } catch { return url; } })();

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("burst"), 8000);
    const t2 = setTimeout(() => setScanDone(true), 8900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (scanDone && auditData !== null) setPhase("result");
  }, [scanDone, auditData]);

  useEffect(() => {
    if (phase !== "result") return;
    const t = setTimeout(() => setAnim(true), 200);
    return () => clearTimeout(t);
  }, [phase]);

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

  const showResult = phase === "result";
  const displayGoals = (goals.length ? goals : ["Signups", "Demo requests"]).slice(0, 2);
  const mobileDropoff = auditData ? getMobileDropoff(auditData.findings) : 42;
  const atRisk = auditData ? getAtRisk(auditData.score, auditData.criticalIssues) : "£2,800/mo";

  return (
    <div className="fade-in" style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Space Grotesk',sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{KEYFRAMES}</style>
      <Blobs />
      <Nav onNew={onError} />
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "8px 28px 60px", position: "relative", zIndex: 10 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 26, fontWeight: 700, color: C.navy, letterSpacing: "-0.5px", margin: "0 0 6px" }}>
            {showResult ? "Your " : "Scanning "}
            <span style={{ background: "linear-gradient(90deg,#186132,#14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {showResult ? "UXpact" : "Your Site"}
            </span>
          </h1>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
            {showResult ? "Here's how your site performed across our analysis." : "We're deep-diving into your site right now."}
          </p>
        </div>

        <div style={{ ...glass, padding: "36px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            <Pill text={displayDomain} v="green" />
            {displayGoals.map((g, i) => (
              <Pill key={i} text={g} v={["Demo requests", "Sales"].includes(g) ? "violet" : "green"} />
            ))}
          </div>

          {!showResult && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, opacity: phase === "burst" ? 0 : 1, transition: "opacity 0.4s ease" }}>
              <div style={{ width: 320, height: 320 }}>
                <NodeMap burst={phase === "burst"} />
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: C.emerald, opacity: lblOp, transition: "opacity 0.3s ease", minHeight: 18, textAlign: "center" }}>
                {STATUS_MSGS[lblIdx]}
              </div>
              <div style={{ width: "100%", maxWidth: 260, height: 3, borderRadius: 2, background: "rgba(0,0,0,0.06)", overflow: "hidden", margin: "0 auto" }}>
                <div ref={barRef} style={{ height: "100%", borderRadius: 2, width: "0%", background: `linear-gradient(90deg,${C.forest},${C.mint})`, boxShadow: "0 0 6px rgba(20,213,113,0.25)" }} />
              </div>
              <div style={{ fontSize: 11, color: C.dim, opacity: hangTight ? 1 : 0, transition: "opacity 0.8s ease", marginTop: 4, textAlign: "center" }}>
                Hang tight — almost there
              </div>
            </div>
          )}

          {showResult && auditData && (
            <CompactResults
              score={auditData.score}
              topFindings={auditData.topFindings}
              mobileDropoff={mobileDropoff}
              atRisk={atRisk}
              onAccess={onAccess}
              animated={anim}
            />
          )}
        </div>
      </div>
    </div>
  );
}
