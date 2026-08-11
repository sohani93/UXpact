// @ts-nocheck
import { useEffect, useState } from "react";

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
  features: "Features", social: "Customers", pricing: "Pricing", cta2: "Bottom CTA", nav: "Nav",
};

const TAG_STYLES: Record<"Rewritten" | "Added" | "Moved", { bg: string; color: string }> = {
  Rewritten: { bg: "#EEF2FF", color: "#3730A3" },
  Added: { bg: "#F0FDF4", color: "#065F46" },
  Moved: { bg: "#FEF3C7", color: "#92400E" },
};

function classifyFix(text: string): "Rewritten" | "Added" | "Moved" {
  const t = text.toLowerCase();
  if (/\badd(ed|ing)?\b|\binsert/.test(t)) return "Added";
  if (/\bmove(d)?\b|\breposition|\babove the fold\b/.test(t)) return "Moved";
  return "Rewritten";
}

function zoneForFix(text: string): string {
  const t = text.toLowerCase();
  if (/testimonial|trust|social proof|review|logo/.test(t)) return "social";
  if (/pricing|price|plan|cost/.test(t)) return "pricing";
  if (/\bcta\b|bottom cta|call.to.action|objection/.test(t)) return "cta2";
  return "features";
}

function buildZoneChanges(storyFixes: string[]): Record<string, { tag: "Rewritten" | "Added" | "Moved"; note: string }> {
  const changes: Record<string, { tag: "Rewritten" | "Added" | "Moved"; note: string }> = {};
  storyFixes.forEach((fix) => {
    const zone = zoneForFix(fix);
    if (!changes[zone]) changes[zone] = { tag: classifyFix(fix), note: fix };
  });
  return changes;
}

function ChangeTag({ tag }: { tag: "Rewritten" | "Added" | "Moved" }) {
  const s = TAG_STYLES[tag];
  return (
    <div style={{ position: "absolute", top: 12, right: 14, fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: s.bg, color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>
      {tag}
    </div>
  );
}

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
  const [recovered, setRecovered] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const cached = sessionStorage.getItem(`audit:${auditId}`);
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!anon) {
        setLoadError("Supabase isn't configured — can't load this blueprint.");
        setLoading(false);
        return;
      }

      try {
        // Fetch audit row
        const auditRes = await fetch(
          `https://oxminualycvnxofoevjs.supabase.co/rest/v1/audits?id=eq.${auditId}&select=*`,
          { headers: { apikey: anon, Authorization: `Bearer ${anon}` } }
        );
        if (!auditRes.ok) throw new Error("Failed to load audit data.");
        const auditRows = await auditRes.json();
        if (auditRows?.[0]) {
          setAuditData(auditRows[0]);
        } else if (cached) {
          try { setAuditData(JSON.parse(cached)); } catch {}
        } else {
          throw new Error("Audit not found.");
        }

        // Fetch findings
        const findingsRes = await fetch(
          `https://oxminualycvnxofoevjs.supabase.co/rest/v1/audit_findings?audit_id=eq.${auditId}&select=*`,
          { headers: { apikey: anon, Authorization: `Bearer ${anon}` } }
        );
        if (!findingsRes.ok) throw new Error("Failed to load findings.");
        const findingsRows = await findingsRes.json();
        setFindings(findingsRows ?? []);
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

  const visionRewrite = auditData?.vision_rewrite ?? null;
  const storyFixesList: string[] = auditData?.story_fixes ?? [];
  const targetArchetype = auditData?.target_archetype ?? null;
  const zoneChanges = visionRewrite ? buildZoneChanges(storyFixesList) : {};
  const whatChangedItems = visionRewrite
    ? [
        { zone: "Hero", tag: "Rewritten" as const, note: visionRewrite.hero_copy || visionRewrite.h1 || "Hero rewritten for target archetype." },
        ...Object.entries(zoneChanges).map(([zone, c]) => ({ zone: ZONE_LABELS[zone] ?? zone, tag: c.tag, note: c.note })),
      ]
    : [];

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
            {visionRewrite && (
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
              ? `Sections restructured for ${targetArchetype ?? "your target"} archetype`
              : `Click a pin to see the fix + AI prompt (${activeFindings.length} findings)`}
          </span>
        </div>

        {/* ── Two-pane ─────────────────────────────────────────────── */}
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
              {facView === "restructured" && visionRewrite && <ChangeTag tag="Rewritten" />}
              <div style={{ fontSize: 27, fontWeight: 700, color: C.navy, fontFamily: "'Unbounded', sans-serif", letterSpacing: "-0.5px", lineHeight: 1.25, marginBottom: 12 }}>
                {facView === "restructured" && visionRewrite ? visionRewrite.h1 : realH1}
              </div>
              <div style={{ fontSize: 13.5, color: C.muted, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 22, maxWidth: 420, margin: "0 auto 22px" }}>
                {facView === "restructured" && visionRewrite
                  ? visionRewrite.hero_copy
                  : realParagraphs[0] ? realParagraphs[0].slice(0, 120) : "Track, measure, and optimise your product with real-time data."}
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ padding: "9px 26px", background: "linear-gradient(135deg, #186132, #148C59)", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {facView === "restructured" && visionRewrite ? visionRewrite.cta : (realCtaTexts[0] || "Get Started")}
                </div>
              </div>
              {facView === "current" && <PinRow zone="hero" {...pinProps} />}
            </FacSection>

            {/* FEATURES */}
            <FacSection active={activeZone === "features"}>
              {facView === "restructured" && zoneChanges.features && <ChangeTag tag={zoneChanges.features.tag} />}
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
              {facView === "current" && <PinRow zone="features" {...pinProps} />}
            </FacSection>

            {/* SOCIAL PROOF */}
            <FacSection active={activeZone === "social"} style={{ background: "rgba(224,231,255,0.07)" }}>
              {facView === "restructured" && zoneChanges.social && <ChangeTag tag={zoneChanges.social.tag} />}
              <FacLabel t="Customers" />
              <FacH2>Trusted by teams at leading companies</FacH2>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14 }}>
                {[100,80,110,90,70].map((w,i) => (
                  <div key={i} style={{ width: w, height: 26, background: "rgba(0,0,0,0.06)", borderRadius: 5 }} />
                ))}
              </div>
              {facView === "restructured" && zoneChanges.social ? (
                <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(209,250,229,0.2)", border: "1px solid rgba(20,140,89,0.15)", borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: C.navy, fontFamily: "'Space Grotesk', sans-serif", fontStyle: "italic", lineHeight: 1.6 }}>{zoneChanges.social.note}</span>
                </div>
              ) : (
                <div style={{ marginTop: 12, padding: "10px 13px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", borderRadius: 8 }}>
                  <span style={{ fontSize: 11.5, color: "#92400E", fontFamily: "'Space Grotesk', sans-serif" }}>No testimonial quotes or outcome data detected in this section.</span>
                </div>
              )}
              {facView === "current" && <PinRow zone="social" {...pinProps} />}
            </FacSection>

            {/* PRICING */}
            <FacSection active={activeZone === "pricing"}>
              {facView === "restructured" && zoneChanges.pricing && <ChangeTag tag={zoneChanges.pricing.tag} />}
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
              {facView === "current" && <PinRow zone="pricing" {...pinProps} />}
            </FacSection>

            {/* BOTTOM CTA */}
            <FacSection active={activeZone === "cta2"} style={{ textAlign: "center", background: "linear-gradient(135deg, rgba(24,97,50,0.04), rgba(91,97,244,0.03))" }}>
              {facView === "restructured" && zoneChanges.cta2 && <ChangeTag tag={zoneChanges.cta2.tag} />}
              <FacH2>{realCtaTexts[1] ? `${realCtaTexts[1]}` : "Ready to get started?"}</FacH2>
              <div style={{ fontSize: 13, color: C.muted, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 20 }}>
                {facView === "restructured" && zoneChanges.cta2 ? zoneChanges.cta2.note : "Join thousands of teams already using our platform."}
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ padding: "9px 26px", background: "linear-gradient(135deg, #186132, #148C59)", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {facView === "restructured" && visionRewrite ? visionRewrite.cta : (realCtaTexts[0] || "Get Started")}
                </div>
              </div>
              {facView === "current" && <PinRow zone="cta2" {...pinProps} />}
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
            {facView === "restructured" ? (
              <div style={{
                background: "rgba(255,255,255,0.4)",
                backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
                borderRadius: 14, border: "1px solid rgba(255,255,255,0.65)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                padding: "20px 20px 16px",
              }}>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 700, color: C.navy, letterSpacing: "-0.2px", marginBottom: 14 }}>
                  What changed
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {whatChangedItems.map((item, i) => {
                    const s = TAG_STYLES[item.tag];
                    return (
                      <div key={i} style={{ paddingBottom: 12, borderBottom: i < whatChangedItems.length - 1 ? `1px solid ${C.border}` : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: s.bg, color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>{item.tag}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 650, color: C.navy, fontFamily: "'Space Grotesk', sans-serif" }}>{item.zone}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, fontFamily: "'Space Grotesk', sans-serif" }}>{item.note}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : activeFinding ? (
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

        {/* Audit ID — centered directly below facsimile */}
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
