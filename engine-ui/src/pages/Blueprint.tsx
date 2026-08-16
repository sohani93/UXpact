// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { getSupabase } from "../lib/supabase";

const C = {
  bg: "#EEF1F5",
  navy: "#0B1C48",
  forest: "#186132",
  emerald: "#148C59",
  mint: "#14D571",
  violet: "#5B61F4",
  red: "#DC2626",
  muted: "#6B7280",
  dim: "#9CA3AF",
  border: "rgba(0,0,0,0.07)",
};

const SEV_PTS: Record<string, number> = { critical: 10, major: 5, minor: 2 };
function getSevPts(sev: string): number {
  return SEV_PTS[sev.toLowerCase()] ?? 2;
}

const CHIP_KEYFRAMES = `
@keyframes chipPop{0%{transform:scale(0.8)}60%{transform:scale(1.12)}100%{transform:scale(1.05)}}
@keyframes countUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
`;

const SEV = {
  Critical: { color: "#DC2626", bg: "#FEE2E2", dot: "#EF4444" },
  Major:    { color: "#D97706", bg: "#FEF3C7", dot: "#F59E0B" },
  Minor:    { color: "#d9a61e", bg: "#FEF9C3", dot: "#EAB308" },
};

// alternating Fix tab backgrounds by finding index (0-based)
const FIX_TAB_BG = [
  { bg: "rgba(209,250,229,0.15)", border: "rgba(255,255,255,0.6)" },
  { bg: "rgba(224,231,255,0.15)", border: "rgba(255,255,255,0.6)" },
  { bg: "rgba(209,250,229,0.15)", border: "rgba(255,255,255,0.6)" },
  { bg: "rgba(224,231,255,0.15)", border: "rgba(255,255,255,0.6)" },
  { bg: "rgba(209,250,229,0.15)", border: "rgba(255,255,255,0.6)" },
  { bg: "rgba(224,231,255,0.15)", border: "rgba(255,255,255,0.6)" },
  { bg: "rgba(209,250,229,0.15)", border: "rgba(255,255,255,0.6)" },
];

const ZONE_MAP: Record<string, string> = {
  nav: "nav", navigation: "nav", header: "nav",
  hero: "hero", "above-fold": "hero", above_fold: "hero", fold: "hero", cta: "hero",
  features: "features", feature: "features", benefits: "features",
  "body-copy": "features", body_copy: "features", content: "features",
  social: "social", "social-proof": "social", social_proof: "social",
  testimonials: "social", trust: "social", logos: "social",
  pricing: "pricing", plans: "pricing",
  cta2: "cta2", "bottom-cta": "cta2", bottom_cta: "cta2", "cta-2": "cta2", footer: "cta2",
};
function normalizeZone(z: string): string {
  return ZONE_MAP[(z ?? "").toLowerCase().trim()] ?? "features";
}

const ZONE_LABELS: Record<string, string> = {
  nav: "Nav", hero: "Hero", features: "Features", social: "Customers", pricing: "Pricing", cta2: "Bottom CTA",
};

// ── Layer 2 — Vision sandbox (relocated from the retired /vision/:auditId page) ──
const ARCHETYPES = ["Hero", "Sage", "Outlaw", "Caregiver", "Creator", "Ruler"] as const;
const DEFAULT_SECTION_ORDER = ["hero", "features", "social", "pricing", "cta2"];
const JOURNEY_STAGE_ORDER = ["arrival", "understanding", "trust-building", "decision", "action"];
const JOURNEY_STAGE_LABELS: Record<string, string> = {
  arrival: "Arrival", understanding: "Understanding", "trust-building": "Trust-building", decision: "Decision", action: "Action",
};
const JOURNEY_STAGE_TO_ZONE: Record<string, string> = {
  arrival: "hero", understanding: "features", "trust-building": "social", decision: "pricing", action: "cta2",
};

const GENERATION_STEPS = [
  "Parsing your site's real structure…",
  "Reordering sections…",
  "Rewriting copy for the story…",
  "Rendering preview…",
];

function zoneForJourneyBreak(jb: { element?: string; journeyStage?: string }): string {
  const text = (jb.element ?? "").toLowerCase();
  if (/testimonial|trust|social proof|review|logo/.test(text)) return "social";
  if (/pricing|price|plan|cost/.test(text)) return "pricing";
  if (/\bcta\b|bottom cta|call.to.action|objection/.test(text)) return "cta2";
  if (/hero|headline|\bh1\b/.test(text)) return "hero";
  if (/feature/.test(text)) return "features";
  return JOURNEY_STAGE_TO_ZONE[jb.journeyStage ?? ""] ?? "features";
}

function seedCopySelectionsFromJourney(journeyBreaks: any[]): Record<string, string> {
  const seeded: Record<string, string> = {};
  journeyBreaks.forEach((jb) => {
    const zone = zoneForJourneyBreak(jb);
    if (!seeded[zone]) seeded[zone] = jb.reason || "Address this journey break.";
  });
  DEFAULT_SECTION_ORDER.forEach((zone) => {
    if (!seeded[zone]) seeded[zone] = "Keep this section's current copy.";
  });
  return seeded;
}

const embedSnippetFor = (auditId: string) =>
  `<script src="https://uxpact.pages.dev/pulse-pro.js" data-uxpact-audit="${auditId}" async></script>`;

const GENERATE_VISION_ENDPOINT =
  import.meta.env.VITE_GENERATE_VISION_ENDPOINT ?? "https://oxminualycvnxofoevjs.supabase.co/functions/v1/generate-vision";
const DEPLOY_VARIANT_ENDPOINT =
  import.meta.env.VITE_DEPLOY_VARIANT_ENDPOINT ?? "https://oxminualycvnxofoevjs.supabase.co/functions/v1/deploy-variant";

// ── Pill ──────────────────────────────────────────────────────────────
function Pill({ text, v }) {
  const s = v === "green"
    ? { background: "#D1FAE5", color: C.navy }
    : { background: "#E0E7FF", color: C.navy };
  return (
    <div style={{ ...s, padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", whiteSpace: "nowrap" }}>
      {text}
    </div>
  );
}

// ── ScoreChip ─────────────────────────────────────────────────────────
function ScoreChip({ pts, visible }: { pts: number; visible: boolean }) {
  return (
    <>
      <style>{CHIP_KEYFRAMES}</style>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 10px", borderRadius: 20,
        background: visible
          ? "linear-gradient(135deg,rgba(91,97,244,0.15),rgba(20,213,113,0.1))"
          : "linear-gradient(135deg,rgba(220,38,38,0.08),rgba(220,38,38,0.04))",
        border: `1px solid ${visible ? "rgba(91,97,244,0.3)" : "rgba(220,38,38,0.15)"}`,
        fontSize: 11, fontWeight: 700,
        color: visible ? C.violet : C.red,
        transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        transform: visible ? "scale(1.05)" : "scale(1)",
        animation: visible ? "chipPop 0.35s ease" : "none",
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        {visible
          ? <span style={{ animation: "countUp 0.4s ease both" }}>+{pts} pts recovered ✦</span>
          : <span>−{pts} pts</span>}
      </div>
    </>
  );
}

// ── Pin ───────────────────────────────────────────────────────────────
function Pin({ finding, active, onClick, isRecovered }) {
  const [hov, setHov] = useState(false);
  const s = SEV[finding.sev];
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: 30, height: 30, borderRadius: "50%",
          background: isRecovered ? C.emerald : (active ? s.color : s.dot),
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
          boxShadow: hov || active ? `0 3px 10px rgba(0,0,0,0.22)` : `0 2px 6px rgba(0,0,0,0.13)`,
          transition: "all 0.2s",
          transform: active ? "scale(1.18)" : hov ? "scale(1.1)" : "none",
          filter: active ? "brightness(0.88)" : "none",
          opacity: isRecovered ? 0.6 : 1,
        }}>
        <span style={{
          fontSize: isRecovered ? 13 : 11.5, fontWeight: 600,
          color: "#fff",
          fontFamily: "'Space Grotesk', sans-serif",
          lineHeight: 1, userSelect: "none",
        }}>{isRecovered ? "✓" : finding.id}</span>
      </div>
      {hov && !active && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 7px)", left: "50%",
          transform: "translateX(-50%)",
          background: C.navy, color: "#fff",
          fontSize: 11, lineHeight: 1.5,
          padding: "6px 10px", borderRadius: 7,
          whiteSpace: "nowrap", zIndex: 50, pointerEvents: "none",
          fontFamily: "'Space Grotesk', sans-serif",
          boxShadow: "0 4px 14px rgba(0,0,0,0.22)",
          maxWidth: 220, textAlign: "center",
        }}>
          {finding.title}
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `5px solid ${C.navy}` }} />
        </div>
      )}
    </div>
  );
}

// ── Fix Drawer ────────────────────────────────────────────────────────
function FixDrawer({ finding, findingIndex, onClose, recovered, onRecover }) {
  const [copied, setCopied] = useState(false);
  const sev = SEV[finding.sev];
  const fixBg = FIX_TAB_BG[findingIndex % FIX_TAB_BG.length];
  const pts = getSevPts(finding.sev);

  const copy = () => {
    navigator.clipboard.writeText(finding.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{
      width: 340, flexShrink: 0,
      background: fixBg.bg,
      backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
      borderRadius: 14,
      border: `1px solid ${fixBg.border}`,
      boxShadow: "0 8px 36px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      animation: "slideIn 0.18s ease-out",
    }}>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}`}</style>

      {/* Header */}
      <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${fixBg.border}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{
                display: "inline-block", fontSize: 9, fontWeight: 600,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: sev.color, background: "rgba(255,255,255,0.7)",
                padding: "2px 8px", borderRadius: 10,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>{finding.sev}</div>
              <ScoreChip pts={pts} visible={recovered} />
            </div>
            <div style={{
              fontSize: 13, fontWeight: 650, color: C.navy, lineHeight: 1.35,
              fontFamily: "'Unbounded', sans-serif", letterSpacing: "-0.2px",
            }}>{finding.title}</div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 18, color: C.dim, lineHeight: 1, padding: "0 2px", flexShrink: 0,
          }}>×</button>
        </div>
      </div>

      {/* Fix section — inherits drawer bg (green or purple) */}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${fixBg.border}` }}>
        <div style={{
          fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em",
          textTransform: "uppercase", color: C.muted,
          fontFamily: "'Space Grotesk', sans-serif", marginBottom: 8,
        }}>Fix</div>
        <div style={{
          fontSize: 13, color: "#374151", lineHeight: 1.7,
          fontFamily: "'Space Grotesk', sans-serif",
        }}>{finding.fix}</div>
      </div>

      {/* AI Prompt section — inner block white/light grey only */}
      <div style={{ padding: "14px 16px", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{
            fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em",
            textTransform: "uppercase", color: C.muted,
            fontFamily: "'Space Grotesk', sans-serif",
          }}>AI-ready prompt</div>
          {/* Copy icon button */}
          <button onClick={finding.prompt ? copy : undefined} title="Copy prompt" style={{
            background: copied ? "linear-gradient(135deg, #186132, #14D571)" : "rgba(255,255,255,0.75)",
            border: copied ? "none" : `1px solid ${fixBg.border}`,
            borderRadius: 8, width: 30, height: 30,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: finding.prompt ? "pointer" : "default", transition: "all 0.2s", flexShrink: 0,
            opacity: finding.prompt ? 1 : 0.4,
          }}>
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke={C.muted} strokeWidth="1.8"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>
        {/* Inner code block — always white/light grey regardless of drawer bg */}
        <div style={{
          background: "rgba(255,255,255,0.75)",
          border: "1px solid rgba(0,0,0,0.06)",
          borderRadius: 8, padding: "12px 14px",
          fontSize: 11.5, lineHeight: 1.7,
          fontFamily: "'Space Grotesk', sans-serif",
          color: "#374151", whiteSpace: "pre-wrap",
        }}>
          {finding.prompt
            ? finding.prompt
            : "AI prompt will be available on your next audit run."}
        </div>
      </div>

      <div style={{ padding: "10px 16px", borderTop: `1px solid ${fixBg.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 12, color: C.muted, fontFamily: "'Space Grotesk', sans-serif",
          display: "flex", alignItems: "center", gap: 4,
        }}>← Back to page</button>
        <button onClick={onRecover} style={{
          padding: "7px 14px", borderRadius: 8, cursor: "pointer",
          fontSize: 11, fontWeight: 700,
          background: recovered
            ? "linear-gradient(135deg, #186132, #14D571)"
            : "rgba(91,97,244,0.08)",
          border: recovered ? "none" : "1px solid rgba(91,97,244,0.3)",
          color: recovered ? "#fff" : C.violet,
          fontFamily: "'Space Grotesk', sans-serif",
          transition: "all 0.2s",
        }}>
          {recovered ? "✓ Fixed" : "Mark as fixed"}
        </button>
      </div>
    </div>
  );
}

// ── Fac helpers ───────────────────────────────────────────────────────
const FacSection = ({ children, style = {}, borderBottom = true, active = false }) => (
  <div style={{ padding: "26px 32px", borderBottom: borderBottom ? `1px solid ${C.border}` : "none", position: "relative", transition: "box-shadow 0.2s", boxShadow: active ? "inset 3px 0 0 rgba(91,97,244,0.5)" : "none", ...style }}>
    {children}
  </div>
);
const FacLabel = ({ t }) => (
  <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.1em", color: C.dim, textTransform: "uppercase", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 5 }}>{t}</div>
);
const FacH2 = ({ children }) => (
  <div style={{ fontSize: 17, fontWeight: 650, color: C.navy, fontFamily: "'Unbounded', sans-serif", letterSpacing: "-0.3px", marginBottom: 8 }}>{children}</div>
);

// ── PIN_POSITIONS — per check_id placement on the page facsimile ─────
const PIN_POSITIONS: Record<string, { side: "left" | "right"; pct: number; top: number }> = {
  "A1.1": { side: "left",  pct: 15, top: 10 },
  "A1.2": { side: "right", pct: 8,  top: 14 },
  "A1.3": { side: "right", pct: 8,  top: 22 },
  "A1.4": { side: "left",  pct: 12, top: 18 },
  "A1.5": { side: "right", pct: 6,  top: 26 },
  "A2.1": { side: "right", pct: 5,  top: 10 },
  "A2.2": { side: "left",  pct: 8,  top: 14 },
  "A2.3": { side: "left",  pct: 10, top: 10 },
  "A3.1": { side: "left",  pct: 12, top: 32 },
  "A3.2": { side: "right", pct: 8,  top: 36 },
  "A3.3": { side: "left",  pct: 10, top: 40 },
  "A4.1": { side: "right", pct: 8,  top: 22 },
  "A4.2": { side: "left",  pct: 10, top: 26 },
  "A4.3": { side: "right", pct: 6,  top: 30 },
  "A4.4": { side: "left",  pct: 12, top: 34 },
  "A4.5": { side: "right", pct: 8,  top: 38 },
  "A5.1": { side: "right", pct: 8,  top: 16 },
  "A5.2": { side: "left",  pct: 10, top: 20 },
  "A5.3": { side: "right", pct: 6,  top: 24 },
  "A5.4": { side: "left",  pct: 12, top: 28 },
  "A6.1": { side: "right", pct: 8,  top: 44 },
  "A6.2": { side: "left",  pct: 10, top: 48 },
  "A7.1": { side: "right", pct: 6,  top: 54 },
  "A7.2": { side: "left",  pct: 12, top: 58 },
  "A7.3": { side: "right", pct: 8,  top: 62 },
  "A8.1": { side: "left",  pct: 10, top: 68 },
  "A8.2": { side: "right", pct: 6,  top: 72 },
  "B1.1": { side: "left",  pct: 14, top: 30 },
  "B1.2": { side: "right", pct: 8,  top: 34 },
  "B2.1": { side: "left",  pct: 10, top: 40 },
  "B2.2": { side: "right", pct: 6,  top: 44 },
  "C4.1": { side: "left",  pct: 10, top: 20 },
  "C4.2": { side: "right", pct: 8,  top: 24 },
  "C5.1": { side: "left",  pct: 12, top: 50 },
  "C5.2": { side: "right", pct: 10, top: 44 },
};

// ── PinRow ────────────────────────────────────────────────────────────
function PinRow({ zone, activeId, setActiveId, findings, isRecovered }) {
  const zf = findings.filter(f => f.zone === zone);
  if (!zf.length) return null;
  return (
    <>
      {zf.map((f, idx) => {
        const pos = PIN_POSITIONS[f.checkId];
        const side = pos?.side ?? "right";
        const pct = pos?.pct ?? 8;
        const top = pos ? pos.top : 10 + idx * 34;
        return (
          <div key={f.id} style={{
            position: "absolute",
            top,
            [side]: `${pct}%`,
            zIndex: 10,
          }}>
            <Pin finding={f}
              active={activeId === f.id}
              isRecovered={isRecovered(f.id)}
              onClick={() => setActiveId(activeId === f.id ? null : f.id)} />
          </div>
        );
      })}
    </>
  );
}

// ── Pulse Footer ──────────────────────────────────────────────────────
function PulseFooter({ totalRecovered = 0 }: { totalRecovered?: number }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 28px 48px", display: "flex", justifyContent: "center" }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 32,
        background: "linear-gradient(135deg, #186132 0%, #14D571 100%)",
        borderRadius: 14, padding: "20px 36px",
        boxShadow: "0 6px 24px rgba(20,140,89,0.22)",
        width: "fit-content",
      }}>
        <div>
          <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.2px", marginBottom: 4 }}>
            {totalRecovered > 0 ? `${totalRecovered} pts recovered.` : "Ready to fix?"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", fontFamily: "'Space Grotesk', sans-serif" }}>
            {totalRecovered > 0 ? "Track every remaining fix with Pulse." : "Pulse tracks every step."}
          </div>
        </div>
        <button
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            padding: "11px 24px", borderRadius: 10, flexShrink: 0,
            background: hov ? "#5B61F4" : "#fff",
            border: "none",
            fontSize: 12, fontWeight: 700,
            color: hov ? "#fff" : C.navy,
            fontFamily: "'Unbounded', sans-serif",
            cursor: "pointer", transition: "all 0.2s",
            boxShadow: hov ? `0 0 0 3px rgba(91,97,244,0.3), 0 4px 18px rgba(91,97,244,0.45)` : "none",
            whiteSpace: "nowrap",
            letterSpacing: "-0.2px",
          }}>
          Start Pulse →
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────
export default function ConversionBlueprint({ auditId }: { auditId: string }) {
  const [activeId, setActiveId] = useState(null);
  const [facView, setFacView] = useState<"current" | "restructured">("current");
  const [auditData, setAuditData] = useState<any>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [journeyBreaks, setJourneyBreaks] = useState<any[]>([]);
  const [recovered, setRecovered] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Vision sandbox state (relocated from the retired /vision/:auditId page)
  const [versions, setVersions] = useState<any[]>([]);
  const [archetype, setArchetype] = useState<string>("");
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [copySelections, setCopySelections] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [genStepIndex, setGenStepIndex] = useState(0);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const stepTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const cached = sessionStorage.getItem(`audit:${auditId}`);
      try {
        const supabase = getSupabase();
        const [
          { data: auditRows, error: auditErr },
          { data: findingsRows, error: findingsErr },
          { data: journeyRows },
          { data: versionRows },
          { data: deployedRows },
        ] = await Promise.all([
          supabase.from("audits").select("*").eq("id", auditId),
          supabase.from("audit_findings").select("*").eq("audit_id", auditId),
          supabase.from("archetype_consistency_scores").select("*").eq("audit_id", auditId),
          supabase.from("vision_versions").select("*").eq("audit_id", auditId).order("version_number", { ascending: true }),
          supabase.from("deployed_variants").select("id").eq("audit_id", auditId).eq("is_active", true).limit(1),
        ]);

        if (auditErr) throw new Error(auditErr.message);
        let audit = auditRows?.[0] ?? null;
        if (!audit && cached) {
          try { audit = JSON.parse(cached); } catch {}
        }
        if (!audit) throw new Error("Audit not found.");
        setAuditData(audit);

        if (findingsErr) throw new Error(findingsErr.message);
        setFindings(findingsRows ?? []);

        const mappedJourney = (journeyRows ?? []).map((j: any) => ({
          journeyStage: j.journey_stage, element: j.element,
          currentArchetypeSignal: j.current_archetype_signal,
          conflictSeverity: j.conflict_severity, reason: j.reason,
        }));
        setJourneyBreaks(mappedJourney);
        setVersions(versionRows ?? []);
        setIsLive((deployedRows ?? []).length > 0);
        setArchetype(audit.target_archetype || "Hero");
        setCopySelections(seedCopySelectionsFromJourney(mappedJourney));
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load blueprint data.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [auditId]);

  const domData = auditData?.dom_data ?? auditData?.domData ?? null;
  const realH1 = domData?.h1Text || auditData?.domain || "yoursite.com";
  const realNavLinks: string[] = domData?.navLinks ?? [];
  const realCtaTexts: string[] = domData?.ctaTexts ?? [];
  const realH2Texts: string[] = domData?.h2Texts ?? [];
  const realParagraphs: string[] = domData?.paragraphTexts ?? [];
  const realDomain = auditData?.domain || "yoursite.com";

  const displayFindings = findings
    .filter((f) => !f.pass && !f.manual_review)
    .map((f, i) => ({
      id: i + 1,
      checkId: f.check_id ?? f.checkId ?? "",
      zone: normalizeZone(f.dom_zone ?? f.domZone ?? ""),
      sev: f.severity
        ? f.severity.charAt(0).toUpperCase() + f.severity.slice(1)
        : "Minor",
      title: f.name ?? "Untitled finding",
      fix: `${f.finding ?? ""}

**Recommended fix:** ${f.fix ?? ""}`,
      prompt: f.ai_prompt ?? f.aiPrompt ?? "",
    }));

  const activeFindings = displayFindings;

  const activeFinding = activeFindings.find(f => f.id === activeId) || null;
  const activeFindingIndex = activeFinding ? activeFindings.indexOf(activeFinding) : 0;

  const totalRecovered = Object.entries(recovered)
    .filter(([, v]) => v)
    .reduce((acc, [k]) => {
      const f = activeFindings.find(f => String(f.id) === k);
      return acc + (f ? getSevPts(f.sev) : 0);
    }, 0);

  const activeZone = activeFinding?.zone ?? null;
  const isRecoveredFn = (id: number | string) => recovered[String(id)] ?? false;
  const pinProps = { activeId, setActiveId, findings: activeFindings, isRecovered: isRecoveredFn };

  // ── Vision sandbox handlers ──────────────────────────────────────────
  const moveSection = (index: number, dir: -1 | 1) => {
    setSectionOrder((order) => {
      const next = [...order];
      const target = index + dir;
      if (target < 0 || target >= next.length) return order;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const startStagedSteps = () => {
    setGenStepIndex(0);
    let i = 0;
    stepTimerRef.current = window.setInterval(() => {
      i = Math.min(i + 1, GENERATION_STEPS.length - 1);
      setGenStepIndex(i);
    }, 1400);
  };
  const stopStagedSteps = () => {
    if (stepTimerRef.current) {
      window.clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  };

  const handleGenerate = async () => {
    if (!auditData?.raw_html) return;
    setGenerating(true);
    setGenError(null);
    startStagedSteps();
    try {
      const response = await fetch(GENERATE_VISION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId, archetype, sectionOrder, copySelections, rawHtml: auditData.raw_html }),
      });
      const json = await response.json();
      if (!response.ok || json.error) {
        setGenError(json.message || "Generation failed. Try again.");
        setGeneratedHtml(null);
      } else {
        setGeneratedHtml(json.html);
        setActiveVersionId(null);
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Couldn't reach the Vision service.");
      setGeneratedHtml(null);
    } finally {
      stopStagedSteps();
      setGenerating(false);
    }
  };

  const handleSaveVersion = async () => {
    if (!generatedHtml) return;
    const supabase = getSupabase();
    const nextVersionNumber = (versions[versions.length - 1]?.version_number ?? 0) + 1;
    const { data, error } = await supabase
      .from("vision_versions")
      .insert({ audit_id: auditId, version_number: nextVersionNumber, archetype, section_order: sectionOrder, copy_selections: copySelections, html: generatedHtml })
      .select("*")
      .single();
    if (!error && data) {
      setVersions((v) => [...v, data]);
      setActiveVersionId(data.id);
    }
  };

  const handleSelectVersion = (v: any) => {
    setGeneratedHtml(v.html);
    setActiveVersionId(v.id);
    setGenError(null);
    setArchetype(v.archetype || archetype);
    if (Array.isArray(v.section_order) && v.section_order.length) setSectionOrder(v.section_order);
    if (v.copy_selections && typeof v.copy_selections === "object") setCopySelections(v.copy_selections);
  };

  const handleDeploy = async () => {
    if (!generatedHtml || !auditData?.raw_html) return;
    setDeploying(true);
    setDeployError(null);
    try {
      const response = await fetch(DEPLOY_VARIANT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId, domain: auditData.domain, generatedHtml, rawHtml: auditData.raw_html, zones: sectionOrder }),
      });
      const json = await response.json();
      if (!response.ok || json.error) {
        setDeployError(json.message || "Deploy failed. Try again.");
      } else {
        setIsLive(true);
      }
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : "Couldn't reach the deploy service.");
    } finally {
      setDeploying(false);
    }
  };

  const handleRollback = async () => {
    const supabase = getSupabase();
    await supabase.from("deployed_variants").update({ is_active: false }).eq("audit_id", auditId).eq("is_active", true);
    setIsLive(false);
    setDeployError(null);
  };

  const copySnippet = () => {
    navigator.clipboard.writeText(embedSnippetFor(auditId));
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 1500);
  };

  const sortedJourneyBreaks = [...journeyBreaks].sort(
    (a, b) => JOURNEY_STAGE_ORDER.indexOf(a.journeyStage) - JOURNEY_STAGE_ORDER.indexOf(b.journeyStage)
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Space Grotesk', sans-serif", position: "relative", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Bg blobs */}
      <div style={{ position: "absolute", top: -80, left: -60, width: 480, height: 480, background: "radial-gradient(circle, rgba(20,213,113,0.09) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", top: 300, right: -80, width: 380, height: 380, background: "radial-gradient(circle, rgba(91,97,244,0.06) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 10 }}>

        {/* ── Nav bar ─────────────────────────────────────────────── */}
        <nav style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", position: "relative", zIndex: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #186132, #14D571)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(20,140,89,0.2)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" /></svg>
            </div>
            <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 16, fontWeight: 700, color: C.navy }}>UXpact</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {["Home", "Audits"].map(t => <span key={t} style={{ fontSize: 13, color: C.muted, fontWeight: 450, cursor: "pointer" }}>{t}</span>)}
            <span style={{ fontSize: 13, color: C.emerald, fontWeight: 600, cursor: "pointer" }}>New Audit</span>
          </div>
        </nav>

        {/* ── Page header ──────────────────────────────────────────── */}
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "4px 28px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 6 }}>
            <h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 26, fontWeight: 700, color: C.navy, letterSpacing: "-0.5px", margin: 0 }}>
              Your{" "}
              <span style={{ background: "linear-gradient(90deg, #186132, #14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Conversion Blueprint
              </span>
            </h1>
            {totalRecovered > 0 && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "4px 12px", borderRadius: 20,
                background: "linear-gradient(135deg,rgba(91,97,244,0.15),rgba(20,213,113,0.1))",
                border: "1px solid rgba(91,97,244,0.3)",
                fontSize: 12, fontWeight: 700, color: C.violet,
                fontFamily: "'Space Grotesk', sans-serif",
                animation: "chipPop 0.35s ease",
              }}>
                +{totalRecovered} pts recovered ✦
              </div>
            )}
          </div>
          <p style={{ fontSize: 14, color: C.muted, margin: 0, fontWeight: 400 }}>
            Every finding mapped to your page — with fixes and AI prompts ready to copy.
          </p>
        </div>

        {/* ── Pills row + severity counts ──────────────────────────── */}
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 28px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {(() => {
              const ctx = sessionStorage.getItem("auditContext");
              const focusAreas: string[] = ctx ? (JSON.parse(ctx).focusAreas ?? []) : [];
              const pills = [
                { text: auditData?.domain || "yoursite.com", v: "green" as const },
                ...focusAreas.slice(0, 5).map((t, i) => ({ text: t, v: (i % 2 === 0 ? "green" : "violet") as const })),
              ];
              return pills.map((p, i) => <Pill key={i} text={p.text} v={p.v} />);
            })()}
            {isLive && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 6, background: "rgba(20,140,89,0.1)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.emerald }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: C.emerald, fontFamily: "'Space Grotesk', sans-serif" }}>Live</span>
              </div>
            )}
          </div>
          {/* Severity counts + Current/Restructured toggle — right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {[
                { sev: "Critical", count: activeFindings.filter(f => f.sev === "Critical").length, dot: "#EF4444" },
                { sev: "Major",    count: activeFindings.filter(f => f.sev === "Major").length,    dot: "#F59E0B" },
                { sev: "Minor",    count: activeFindings.filter(f => f.sev === "Minor").length,    dot: "#EAB308" },
              ].map(({ sev, count, dot }) => (
                <div key={sev} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.navy, fontFamily: "'Space Grotesk', sans-serif" }}>{count}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: C.navy, fontFamily: "'Space Grotesk', sans-serif" }}>{sev}</span>
                </div>
              ))}
            </div>
            {auditData?.raw_html && (
              <div style={{ display: "flex", background: "rgba(0,0,0,0.05)", borderRadius: 8, padding: 3, gap: 2 }}>
                {(["current", "restructured"] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => { setFacView(v); setActiveId(null); }}
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 11, fontWeight: 600,
                      padding: "5px 13px", borderRadius: 6, border: "none",
                      cursor: "pointer", transition: "all 0.18s",
                      background: facView === v
                        ? v === "restructured" ? "linear-gradient(135deg, #186132, #148C59)" : "#fff"
                        : "transparent",
                      color: facView === v ? (v === "restructured" ? "#fff" : C.navy) : C.muted,
                      boxShadow: facView === v && v === "current" ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                    }}
                  >
                    {v === "current" ? "Current" : "Restructured"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Hint — right-aligned, directly below severity row, zero top gap */}
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 28px 12px", display: "flex", justifyContent: "flex-end" }}>
          <span style={{ fontSize: 11, color: C.dim, fontFamily: "'Space Grotesk', sans-serif" }}>
            {facView === "restructured"
              ? "Pick a story direction, decide what changes, and generate a real rebuild"
              : `Click a pin to see the fix + AI prompt (${activeFindings.length} findings)`}
          </span>
        </div>

        {facView === "current" ? (
          /* ── Two-pane facsimile (unchanged from Layer 0/prototype) ─── */
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 28px 0", display: "flex", gap: 16, alignItems: "flex-start" }}>

            {/* ── Facsimile ─────────────────────────────────────────── */}
            <div style={{
              flex: 1, borderRadius: 16,
              background: "rgba(255,255,255,0.52)",
              backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.7)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
              overflow: "hidden",
            }}>

              {/* Browser bar */}
              <div style={{ background: "rgba(0,0,0,0.025)", borderBottom: `1px solid ${C.border}`, padding: "7px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", gap: 5 }}>
                  {["#ef4444","#f59e0b","#22c55e"].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.45 }} />)}
                </div>
                <div style={{ flex: 1, background: "rgba(0,0,0,0.04)", borderRadius: 5, padding: "2px 10px", fontSize: 11, color: C.dim, fontFamily: "'Space Grotesk', sans-serif", textAlign: "center" }}>
                  https://{realDomain}
                </div>
              </div>

              {/* Site NAV */}
              <FacSection active={activeZone === "nav"} style={{ padding: "13px 28px", background: "rgba(255,255,255,0.35)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 14, fontWeight: 700, color: C.navy }}>
                    {realDomain.split(".")[0].charAt(0).toUpperCase() + realDomain.split(".")[0].slice(1)}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    {(realNavLinks.length > 0 ? realNavLinks.slice(0, 5) : ["Home", "Features", "Pricing", "Blog"]).map((l) => (
                      <span key={l} style={{ fontSize: 12, color: C.muted, fontFamily: "'Space Grotesk', sans-serif" }}>{l}</span>
                    ))}
                    <span style={{ fontSize: 12, color: C.muted, fontFamily: "'Space Grotesk', sans-serif", padding: "4px 14px", border: `1px solid ${C.border}`, borderRadius: 20 }}>Get Started</span>
                  </div>
                </div>
                <PinRow zone="nav" {...pinProps} />
              </FacSection>

              {/* HERO */}
              <FacSection active={activeZone === "hero"} style={{ textAlign: "center", padding: "44px 48px 36px", background: "linear-gradient(180deg, rgba(209,250,229,0.1) 0%, transparent 100%)" }}>
                <div style={{ fontSize: 27, fontWeight: 700, color: C.navy, fontFamily: "'Unbounded', sans-serif", letterSpacing: "-0.5px", lineHeight: 1.25, marginBottom: 12 }}>
                  {realH1}
                </div>
                <div style={{ fontSize: 13.5, color: C.muted, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 22, maxWidth: 420, margin: "0 auto 22px" }}>
                  {realParagraphs[0] ? realParagraphs[0].slice(0, 120) : "Track, measure, and optimise your product with real-time data."}
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{ padding: "9px 26px", background: "linear-gradient(135deg, #186132, #148C59)", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
                    {realCtaTexts[0] || "Get Started"}
                  </div>
                </div>
                <PinRow zone="hero" {...pinProps} />
              </FacSection>

              {/* FEATURES */}
              <FacSection active={activeZone === "features"}>
                <FacLabel t="Features" />
                <FacH2>Everything you need to understand your users</FacH2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 11, marginTop: 14 }}>
                  {(realH2Texts.length >= 3
                    ? realH2Texts.slice(0, 3).map((t) => ({ t, b: "" }))
                    : [
                        { t: "Real-time dashboards", b: "We built our dashboards to give you instant visibility across all your key metrics." },
                        { t: "Custom reports", b: "Our reporting engine lets your team generate any report you need." },
                        { t: "Team collaboration", b: "We designed collaboration features so your whole team stays aligned." },
                      ]
                  ).map((c, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.55)", border: `1px solid ${C.border}`, borderRadius: 9, padding: "13px 14px" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 650, color: C.navy, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>{c.t}</div>
                      {c.b && <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, fontFamily: "'Space Grotesk', sans-serif" }}>{c.b}</div>}
                    </div>
                  ))}
                </div>
                <PinRow zone="features" {...pinProps} />
              </FacSection>

              {/* SOCIAL PROOF */}
              <FacSection active={activeZone === "social"} style={{ background: "rgba(224,231,255,0.07)" }}>
                <FacLabel t="Customers" />
                <FacH2>Trusted by teams at leading companies</FacH2>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14 }}>
                  {[100,80,110,90,70].map((w,i) => (
                    <div key={i} style={{ width: w, height: 26, background: "rgba(0,0,0,0.06)", borderRadius: 5 }} />
                  ))}
                </div>
                <div style={{ marginTop: 12, padding: "10px 13px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", borderRadius: 8 }}>
                  <span style={{ fontSize: 11.5, color: "#92400E", fontFamily: "'Space Grotesk', sans-serif" }}>No testimonial quotes or outcome data detected in this section.</span>
                </div>
                <PinRow zone="social" {...pinProps} />
              </FacSection>

              {/* PRICING */}
              <FacSection active={activeZone === "pricing"}>
                <FacLabel t="Pricing" />
                <FacH2>Simple, transparent pricing</FacH2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginTop: 14 }}>
                  {[
                    { name: "Starter",    price: "$0",     mo: "free forever",  pop: false },
                    { name: "Growth",     price: "$49",    mo: "/ month",       pop: false },
                    { name: "Pro",        price: "$99",    mo: "/ month",       pop: true  },
                    { name: "Enterprise", price: "Custom", mo: "",              pop: false },
                  ].map((p, i) => (
                    <div key={i} style={{
                      background: p.pop ? "rgba(20,140,89,0.06)" : "rgba(255,255,255,0.55)",
                      border: `1px solid ${p.pop ? "rgba(20,140,89,0.2)" : C.border}`,
                      borderRadius: 9, padding: "14px 12px", textAlign: "center",
                    }}>
                      {p.pop && <div style={{ fontSize: 8.5, fontWeight: 600, color: C.emerald, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3, fontFamily: "'Space Grotesk', sans-serif" }}>Popular</div>}
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: C.navy, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 5 }}>{p.name}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, fontFamily: "'Unbounded', sans-serif" }}>{p.price}</div>
                      <div style={{ fontSize: 9.5, color: C.dim, fontFamily: "'Space Grotesk', sans-serif" }}>{p.mo}</div>
                    </div>
                  ))}
                </div>
                <PinRow zone="pricing" {...pinProps} />
              </FacSection>

              {/* BOTTOM CTA */}
              <FacSection active={activeZone === "cta2"} style={{ textAlign: "center", background: "linear-gradient(135deg, rgba(24,97,50,0.04), rgba(91,97,244,0.03))" }}>
                <FacH2>{realCtaTexts[1] ? `${realCtaTexts[1]}` : "Ready to get started?"}</FacH2>
                <div style={{ fontSize: 13, color: C.muted, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 20 }}>Join thousands of teams already using our platform.</div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{ padding: "9px 26px", background: "linear-gradient(135deg, #186132, #148C59)", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
                    {realCtaTexts[0] || "Get Started"}
                  </div>
                </div>
                <PinRow zone="cta2" {...pinProps} />
              </FacSection>

              {/* FOOTER */}
              <FacSection borderBottom={false} style={{ padding: "14px 28px", background: "rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: C.dim, fontFamily: "'Space Grotesk', sans-serif" }}>© 2026 {realDomain}</span>
                  <div style={{ display: "flex", gap: 14 }}>
                    {["Privacy","Terms","Contact"].map(l => (
                      <span key={l} style={{ fontSize: 11, color: C.dim, fontFamily: "'Space Grotesk', sans-serif" }}>{l}</span>
                    ))}
                  </div>
                </div>
              </FacSection>
            </div>

            {/* ── Fix Drawer (sticky) ───────────────────────────────── */}
            <div style={{ position: "sticky", top: 20, width: 340, flexShrink: 0 }}>
              {activeFinding ? (
                <FixDrawer
                  finding={activeFinding}
                  findingIndex={activeFindingIndex}
                  onClose={() => setActiveId(null)}
                  recovered={recovered[String(activeFinding.id)] ?? false}
                  onRecover={() => setRecovered(r => ({ ...r, [String(activeFinding.id)]: !r[String(activeFinding.id)] }))}
                />
              ) : loadError ? (
                <div style={{
                  background: "rgba(255,255,255,0.4)",
                  backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
                  borderRadius: 14, border: "1px solid rgba(220,38,38,0.2)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                  padding: "36px 24px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 14 }}>⚠️</div>
                  <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 700, color: C.red, letterSpacing: "-0.2px", marginBottom: 8 }}>
                    Couldn't load this blueprint
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, fontFamily: "'Space Grotesk', sans-serif" }}>
                    {loadError} Try refreshing the page.
                  </div>
                </div>
              ) : loading ? (
                <div style={{
                  background: "rgba(255,255,255,0.4)",
                  backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
                  borderRadius: 14, border: "1px solid rgba(255,255,255,0.65)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                  padding: "36px 24px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 12, color: C.muted, fontFamily: "'Space Grotesk', sans-serif" }}>Loading blueprint…</div>
                </div>
              ) : activeFindings.length === 0 ? (
                <div style={{
                  background: "rgba(255,255,255,0.4)",
                  backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
                  borderRadius: 14, border: "1px solid rgba(255,255,255,0.65)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                  padding: "36px 24px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 14 }}>✅</div>
                  <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 700, color: C.navy, letterSpacing: "-0.2px", marginBottom: 8 }}>
                    No conversion blockers found
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, fontFamily: "'Space Grotesk', sans-serif" }}>
                    This audit didn't flag any failing checks to pin here.
                  </div>
                </div>
              ) : (
                <div style={{
                  background: "rgba(255,255,255,0.4)",
                  backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
                  borderRadius: 14, border: "1px solid rgba(255,255,255,0.65)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                  padding: "36px 24px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 14 }}>📍</div>
                  <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 700, color: C.navy, letterSpacing: "-0.2px", marginBottom: 8 }}>
                    Click a pin
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 20 }}>
                    Each numbered dot maps a conversion issue to the section where it occurs.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {[
                      { dot: "#EF4444", label: "Critical — fix immediately" },
                      { dot: "#F59E0B", label: "Major — high impact" },
                      { dot: "#EAB308", label: "Minor — quick win" },
                    ].map(({ dot, label }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 9, textAlign: "left" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                        <span style={{ fontSize: 11.5, color: C.muted, fontFamily: "'Space Grotesk', sans-serif" }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Vision sandbox (relocated from /vision/:auditId) ──────── */
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 28px 40px", display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "flex-start" }}>

            {/* Left rail */}
            <div style={{
              background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              borderRadius: 14, border: "1px solid rgba(255,255,255,0.7)", boxShadow: "0 8px 32px rgba(0,0,0,0.05)",
              padding: "18px 18px 20px", position: "sticky", top: 20,
            }}>
              {sortedJourneyBreaks.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.dim, marginBottom: 10 }}>Where the journey breaks down</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                    {sortedJourneyBreaks.map((jb, i) => (
                      <div key={i} style={{ fontSize: 11, lineHeight: 1.5 }}>
                        <span style={{ fontWeight: 700, color: C.violet, textTransform: "uppercase", fontSize: 9, letterSpacing: "0.06em" }}>{JOURNEY_STAGE_LABELS[jb.journeyStage] ?? jb.journeyStage}</span>
                        <div style={{ color: C.muted }}>{jb.reason}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.dim, marginBottom: 10 }}>Story direction</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                {ARCHETYPES.map((a) => (
                  <button key={a} onClick={() => setArchetype(a)} style={{
                    padding: "6px 12px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'Space Grotesk',sans-serif", transition: "all 0.15s",
                    background: archetype === a ? "linear-gradient(135deg,#186132,#14D571)" : "rgba(0,0,0,0.05)",
                    color: archetype === a ? "#fff" : C.muted,
                    border: "none",
                  }}>{a}</button>
                ))}
              </div>

              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.dim, marginBottom: 10 }}>Section order</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                {sectionOrder.map((zone, i) => (
                  <div key={zone} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.6)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.navy, flex: 1 }}>{ZONE_LABELS[zone] ?? zone}</span>
                    <button onClick={() => moveSection(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.3 : 1, fontSize: 13, color: C.muted, padding: "0 3px" }}>↑</button>
                    <button onClick={() => moveSection(i, 1)} disabled={i === sectionOrder.length - 1} style={{ background: "none", border: "none", cursor: i === sectionOrder.length - 1 ? "default" : "pointer", opacity: i === sectionOrder.length - 1 ? 0.3 : 1, fontSize: 13, color: C.muted, padding: "0 3px" }}>↓</button>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.dim, marginBottom: 10 }}>What to change</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {sectionOrder.map((zone) => (
                  <div key={zone}>
                    <div style={{ fontSize: 11, fontWeight: 650, color: C.navy, marginBottom: 4 }}>{ZONE_LABELS[zone] ?? zone}</div>
                    <textarea
                      value={copySelections[zone] ?? ""}
                      onChange={(e) => setCopySelections((c) => ({ ...c, [zone]: e.target.value }))}
                      rows={2}
                      style={{
                        width: "100%", resize: "vertical", fontSize: 11.5, fontFamily: "'Space Grotesk',sans-serif",
                        padding: "7px 9px", borderRadius: 7, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.7)",
                        color: "#374151", lineHeight: 1.5, boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  width: "100%", padding: "11px 0", borderRadius: 10, border: "none",
                  background: generating ? "rgba(24,97,50,0.4)" : "linear-gradient(135deg,#186132,#14D571)",
                  color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "'Unbounded',sans-serif",
                  cursor: generating ? "default" : "pointer", boxShadow: generating ? "none" : "0 4px 18px rgba(20,140,89,0.3)",
                }}
              >
                {generating ? "Generating…" : generatedHtml ? "Regenerate" : "Generate"}
              </button>
            </div>

            {/* Right — output */}
            <div>
              {versions.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {versions.map((v) => (
                    <button key={v.id} onClick={() => handleSelectVersion(v)} style={{
                      padding: "5px 12px", borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      fontFamily: "'Space Grotesk',sans-serif",
                      background: activeVersionId === v.id ? "rgba(91,97,244,0.14)" : "rgba(255,255,255,0.6)",
                      color: activeVersionId === v.id ? C.violet : C.muted,
                      border: `1px solid ${activeVersionId === v.id ? "rgba(91,97,244,0.35)" : C.border}`,
                    }}>v{v.version_number} · {v.archetype}</button>
                  ))}
                </div>
              )}

              <div style={{
                borderRadius: 14, overflow: "hidden", background: "#fff",
                border: "1px solid rgba(255,255,255,0.7)", boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
                minHeight: 520, display: "flex", flexDirection: "column",
              }}>
                <div style={{ background: "rgba(0,0,0,0.03)", borderBottom: `1px solid ${C.border}`, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {["#ef4444", "#f59e0b", "#22c55e"].map((c) => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.45 }} />)}
                  </div>
                  <div style={{ flex: 1, background: "rgba(0,0,0,0.04)", borderRadius: 5, padding: "3px 10px", fontSize: 11, color: C.dim, textAlign: "center" }}>
                    https://{realDomain}
                  </div>
                  {generatedHtml && !generating && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={handleSaveVersion} style={{
                        padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                        background: "rgba(20,140,89,0.12)", color: C.emerald, fontSize: 11, fontWeight: 700,
                        fontFamily: "'Space Grotesk',sans-serif",
                      }}>Save version</button>
                      {isLive ? (
                        <button onClick={handleRollback} style={{
                          padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                          background: "rgba(220,38,38,0.1)", color: C.red, fontSize: 11, fontWeight: 700,
                          fontFamily: "'Space Grotesk',sans-serif",
                        }}>Rollback</button>
                      ) : (
                        <button onClick={handleDeploy} disabled={deploying} style={{
                          padding: "5px 12px", borderRadius: 7, border: "none", cursor: deploying ? "default" : "pointer",
                          background: deploying ? "rgba(91,97,244,0.3)" : C.violet, color: "#fff", fontSize: 11, fontWeight: 700,
                          fontFamily: "'Space Grotesk',sans-serif",
                        }}>{deploying ? "Deploying…" : "Deploy"}</button>
                      )}
                    </div>
                  )}
                </div>

                {isLive && (
                  <div style={{ padding: "10px 16px", background: "rgba(20,140,89,0.06)", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.emerald, fontFamily: "'Space Grotesk',sans-serif" }}>Live on {realDomain} —</span>
                    <code style={{ fontSize: 10.5, color: "#374151", background: "rgba(255,255,255,0.7)", padding: "3px 8px", borderRadius: 5, fontFamily: "monospace", flex: 1, minWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {embedSnippetFor(auditId)}
                    </code>
                    <button onClick={copySnippet} style={{
                      padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                      background: copiedSnippet ? "linear-gradient(135deg,#186132,#14D571)" : "rgba(0,0,0,0.06)",
                      color: copiedSnippet ? "#fff" : C.navy, fontSize: 10.5, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif",
                    }}>{copiedSnippet ? "Copied" : "Copy"}</button>
                  </div>
                )}
                {deployError && (
                  <div style={{ padding: "8px 16px", background: "rgba(220,38,38,0.06)", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.red, fontFamily: "'Space Grotesk',sans-serif" }}>
                    {deployError}
                  </div>
                )}

                <div style={{ flex: 1, position: "relative" }}>
                  {generating ? (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(20,140,89,0.15)", borderTopColor: C.emerald, animation: "spin 0.8s linear infinite" }} />
                      <div style={{ fontSize: 13, color: C.navy, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif" }}>{GENERATION_STEPS[genStepIndex]}</div>
                    </div>
                  ) : genError ? (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 32, textAlign: "center" }}>
                      <div style={{ fontSize: 26 }}>⚠️</div>
                      <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 13, fontWeight: 700, color: C.red }}>Couldn't generate this version</div>
                      <div style={{ fontSize: 12, color: C.muted, maxWidth: 360, lineHeight: 1.6 }}>{genError}</div>
                      <button onClick={handleGenerate} style={{
                        marginTop: 6, padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: "linear-gradient(135deg,#186132,#14D571)", color: "#fff", fontSize: 12, fontWeight: 700,
                        fontFamily: "'Space Grotesk',sans-serif",
                      }}>Try again</button>
                    </div>
                  ) : generatedHtml ? (
                    <iframe
                      title="Vision preview"
                      srcDoc={generatedHtml}
                      sandbox="allow-same-origin allow-scripts"
                      style={{ width: "100%", height: 640, border: "none", display: "block" }}
                    />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 32, textAlign: "center" }}>
                      <div style={{ fontSize: 26 }}>✦</div>
                      <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 13, fontWeight: 700, color: C.navy }}>Ready when you are</div>
                      <div style={{ fontSize: 12, color: C.muted, maxWidth: 320, lineHeight: 1.6 }}>
                        Pick a story direction, adjust the section order and copy, then generate a full rebuild of {realDomain}.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audit ID — centered directly below the pane */}
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "10px 28px 28px", textAlign: "center" }}>
          <span style={{ fontSize: 11, color: C.dim, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.06em" }}>
            {realDomain}
            {" · "}
            Audit #{auditId}
            {(auditData?.created_at ?? auditData?.createdAt) && (
              <> · {new Date(auditData.created_at ?? auditData.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</>
            )}
          </span>
        </div>

        {/* ── Pulse footer ──────────────────────────────────────── */}
        <PulseFooter totalRecovered={totalRecovered} />
      </div>
    </div>
  );
}
