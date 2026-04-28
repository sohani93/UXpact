// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Nav from "../components/Nav";
import Blobs from "../components/Blobs";
import ArcGauge from "../components/ArcGauge";

// ── Supabase client ────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// ── Design tokens ──────────────────────────────────────────────────────
const C = {
  bg: "#EEF1F5", navy: "#0B1C48", forest: "#186132", emerald: "#148C59",
  mint: "#14D571", violet: "#5B61F4", muted: "#6B7280", dim: "#9CA3AF",
  red: "#DC2626", amber: "#F97316", yellow: "#EAB308",
};

const glass = {
  background: "rgba(255,255,255,0.5)", backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)", borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.65)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.7)",
};

const cardBgs = [
  { background: "rgba(255,255,255,0.65)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.7)" },
  { background: "linear-gradient(160deg,rgba(20,213,113,0.09) 0%,rgba(255,255,255,0.55) 100%)", backdropFilter: "blur(24px)", border: "1px solid rgba(20,213,113,0.12)" },
  { background: "#EEF1F5", border: "none", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
];

const KEYFRAMES = `
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes countUp{from{opacity:0;transform:translateY(6px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes pulseAnim{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.85)}}
.fade-in{animation:fadeIn 0.4s ease both}
.fade-up{animation:fadeUp 0.4s ease both}
`;

// ── Finding state machine ──────────────────────────────────────────────
const STATES = ["unread", "acknowledged", "in-progress", "done"];
const STATE_LABEL = { unread: "Unread", acknowledged: "Acknowledged", "in-progress": "In Progress", done: "Done" };
const STATE_STYLE = {
  unread:        { background: "rgba(11,28,72,0.06)",    color: "#9CA3AF" },
  acknowledged:  { background: "rgba(91,97,244,0.1)",    color: "#5B61F4" },
  "in-progress": { background: "rgba(20,140,89,0.1)",    color: "#148C59" },
  done:          { background: "rgba(20,213,113,0.15)",   color: "#0a6b30" },
};

// Score recovery points per severity when marked done
const SEV_RECOVERY = { critical: 10, major: 5, minor: 2 };

// ── Industry benchmarks ────────────────────────────────────────────────
const BENCHMARKS: Record<string, { avg: number; top: number; label: string }> = {
  saas:        { avg: 68, top: 81, label: "SaaS / Software" },
  ecommerce:   { avg: 65, top: 78, label: "E-commerce" },
  portfolio:   { avg: 58, top: 72, label: "Portfolio" },
  healthcare:  { avg: 62, top: 75, label: "Healthcare" },
  fintech:     { avg: 66, top: 80, label: "Fintech" },
  service:     { avg: 60, top: 74, label: "Service Business" },
};

// ── Glossary ───────────────────────────────────────────────────────────
const GLOSSARY_TERMS = [
  { t: "conversion architecture", d: "The structural design of a page built to guide visitors toward a specific action. Covers CTA placement, visual hierarchy, and friction reduction across the full page flow." },
  { t: "cognitive load", d: "The mental effort a visitor needs to process a page. Cluttered layouts, feature-led copy, and competing CTAs all increase cognitive load and suppress conversion." },
  { t: "trust proximity", d: "Placing social proof such as testimonials, logos, and ratings in close spatial relation to the primary CTA. Reduces hesitation at the exact moment of decision." },
  { t: "scent trail", d: "The continuity of messaging and visual cues from an ad or referral source through to the landing page CTA. A broken scent trail is a leading cause of above-fold drop-off." },
];

// ── Severity dot colours ───────────────────────────────────────────────
const SEV_DOT: Record<string, string> = {
  critical: "#EF4444", major: "#F59E0B", minor: "#EAB308",
};

// ── Helpers ────────────────────────────────────────────────────────────
const getScoreColor = (s: number) => s >= 70 ? C.mint : s >= 40 ? C.emerald : C.forest;
const getSevBadge = (s: number) => {
  if (s >= 80) return { label: "Strong",     bg: "#D1FAE5", color: C.emerald };
  if (s >= 60) return { label: "Decent",     bg: "#E0E7FF", color: C.violet  };
  if (s >= 40) return { label: "Needs Work", bg: "#FEF3C7", color: "#D97706" };
  return           { label: "Critical",   bg: "#FEE2E2", color: C.red    };
};

function calcCatScore(items: any[]): number {
  if (!items.length) return 100;
  return Math.round(items.filter(f => f.pass).length / items.length * 100);
}

function getMobileDropoff(findings: any[]): number {
  let v = 35;
  const ids = findings.filter(f => !f.pass).map(f => f.check_id ?? "");
  if (ids.includes("A1.4") || ids.some(id => id.startsWith("A5"))) v += 12;
  if (ids.includes("A5.2")) v += 8;
  if (ids.includes("A1.6") || ids.includes("A3.2")) v += 5;
  return Math.min(65, Math.round(v / 5) * 5);
}

function getAtRisk(score: number, criticals: number): string {
  if (score < 40 && criticals > 2) return "£5,200/mo";
  if (score < 40)                  return "£2,800/mo";
  if (score < 60)                  return "£1,100/mo";
  return "£480/mo";
}

function formatDate(d?: string): string {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Data hook ──────────────────────────────────────────────────────────
function useAuditData(auditId: string) {
  const [auditRow, setAuditRow] = useState<any>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      // Try sessionStorage cache first for immediate render
      const cached = sessionStorage.getItem(`audit:${auditId}`);
      if (cached) {
        try {
          const c = JSON.parse(cached);
          setAuditRow({ id: c.auditId, domain: c.domain, score: c.score, industry: "saas", created_at: c.createdAt });
          setFindings((c.findings ?? []).map((f: any) => ({
            id: f.id, check_id: f.id, name: f.name, severity: f.severity,
            finding: f.finding, fix: f.fix, ai_prompt: f.aiPrompt,
            pass: f.pass, category: f.category ?? "", dom_zone: f.domZone ?? "body-copy",
            glossary_terms: f.glossaryTerms ?? [], manual_review: false,
          })));
          setLoading(false);
        } catch {}
      }

      // Always fetch fresh from Supabase
      const [{ data: auditData, error: auditErr }, { data: findingsData, error: findingsErr }] = await Promise.all([
        supabase.from("audits").select("*").eq("id", auditId).maybeSingle(),
        supabase.from("audit_findings").select("*").eq("audit_id", auditId),
      ]);

      if (auditErr || findingsErr) {
        if (!auditRow) setError(auditErr?.message || findingsErr?.message || "Failed to load.");
        setLoading(false);
        return;
      }
      if (!auditData) {
        if (!auditRow) setError("Audit not found.");
        setLoading(false);
        return;
      }

      setAuditRow(auditData);
      setFindings(findingsData ?? []);
      setLoading(false);
    };
    void load();
  }, [auditId]);

  return { auditRow, findings, loading, error };
}

// ── Sub-components ─────────────────────────────────────────────────────

function FindingCard({ f, state, onState, active, onOpen }) {
  const si = STATES.indexOf(state);
  const sevDot = SEV_DOT[f.severity] ?? "#9CA3AF";
  const handleClick = () => { if (state === "unread") onState("acknowledged"); onOpen(f.id); };
  const cycleState = e => { e.stopPropagation(); onState(STATES[(si + 1) % STATES.length]); };
  return (
    <div style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(16px)", border: active ? `1.5px solid ${C.violet}` : "1px solid rgba(255,255,255,0.8)", borderRadius: 12, marginBottom: 8, overflow: "hidden", opacity: state === "done" ? 0.6 : 1, transition: "all 0.2s ease", boxShadow: active ? "0 2px 12px rgba(91,97,244,0.12)" : "0 2px 10px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 18px", cursor: "pointer", userSelect: "none" }} onClick={handleClick}>
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: sevDot, flexShrink: 0, boxShadow: `0 0 6px ${sevDot}55` }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 650, color: C.navy, marginBottom: 1, textDecoration: state === "done" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{f.category || ""}</div>
        </div>
        <div onClick={cycleState} style={{ ...STATE_STYLE[state], padding: "3px 11px", borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif", letterSpacing: "0.3px", transition: "all 0.25s ease", flexShrink: 0, userSelect: "none" }}>{STATE_LABEL[state]}</div>
        <div style={{ fontSize: 11, color: active ? C.violet : C.dim, transform: active ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.28s ease", flexShrink: 0 }}>▾</div>
      </div>
      {active && (
        <div style={{ padding: "0 18px 16px", animation: "fadeUp 0.2s ease both" }}>
          <div style={{ height: 1, background: "rgba(0,0,0,0.05)", marginBottom: 12 }} />
          <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, margin: "0 0 10px" }}>{f.finding}</p>
          {f.fix && (
            <div style={{ background: "rgba(20,140,89,0.05)", border: "1px solid rgba(20,140,89,0.1)", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.emerald, marginBottom: 5 }}>Recommended fix</div>
              <div style={{ fontSize: 12, color: C.navy, lineHeight: 1.6 }}>{f.fix}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CatScores({ cats }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);
  const left = [cats[0], cats[2], cats[4]].filter(Boolean);
  const right = [cats[1], cats[3]].filter(Boolean);
  const tile = (cat, i) => {
    const sev = getSevBadge(cat.score);
    return (
      <div key={cat.name} style={{ padding: "10px 12px", borderRadius: 9, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(4px)", animation: `fadeUp 0.3s ease ${i * 0.08}s both` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.75)", lineHeight: 1.3 }}>{cat.name}</span>
            <span style={{ fontSize: 8, fontWeight: 700, color: sev.color, background: "rgba(255,255,255,0.9)", borderRadius: 20, padding: "1px 7px", flexShrink: 0 }}>{sev.label}</span>
          </div>
          <span style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 16, fontWeight: 800, color: "#fff", flexShrink: 0, marginLeft: 8, animation: `countUp 0.5s ease ${i * 0.1}s both` }}>{cat.score}</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 2, background: "rgba(255,255,255,0.85)", width: mounted ? `${cat.score}%` : "0%", transition: `width 0.9s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s` }} />
        </div>
      </div>
    );
  };
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "stretch" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>{left.map((c, i) => tile(c, i))}</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>{right.map((c, i) => tile(c, i + 1))}</div>
    </div>
  );
}

function CBTile({ item, delay }) {
  const [open, setOpen] = useState(false);
  const sc = getSevBadge(item.score);
  return (
    <div onClick={() => setOpen(o => !o)} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.85)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", animation: `fadeUp 0.25s ease ${delay}s both`, cursor: "pointer", transition: "box-shadow 0.2s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: C.navy }}>{item.label}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 14, fontWeight: 800, color: getScoreColor(item.score) }}>{item.score}</span>
          <span style={{ fontSize: 8.5, fontWeight: 700, color: sc.color, background: sc.bg, borderRadius: 20, padding: "2px 7px" }}>{sc.label}</span>
          <span style={{ fontSize: 9, color: C.dim, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
        </div>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: "rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: open ? 7 : 0 }}>
        <div style={{ height: "100%", borderRadius: 2, background: getScoreColor(item.score), width: `${item.score}%`, transition: "width 0.8s ease" }} />
      </div>
      {open && <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.45, paddingTop: 4, animation: "fadeUp 0.15s ease both" }}>{item.verdict}</div>}
    </div>
  );
}

function GlossaryStrip() {
  const [active, setActive] = useState(null);
  return (
    <div style={{ marginTop: 24, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: C.dim, marginRight: 4 }}>Glossary</span>
          {GLOSSARY_TERMS.map((g, i) => (
            <div key={i} style={{ position: "relative", display: "inline-block" }}>
              <span onClick={() => setActive(active === i ? null : i)} style={{ fontSize: 12, fontWeight: 600, color: active === i ? C.violet : C.emerald, cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3, transition: "color 0.15s" }}>{g.t}</span>
              {i < GLOSSARY_TERMS.length - 1 && <span style={{ color: C.dim, margin: "0 6px", fontSize: 11 }}>|</span>}
              {active === i && (
                <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, width: 260, background: C.navy, color: "#fff", fontSize: 11.5, lineHeight: 1.6, padding: "10px 14px", borderRadius: 9, zIndex: 100, boxShadow: "0 6px 20px rgba(0,0,0,0.2)", fontFamily: "'Space Grotesk',sans-serif", animation: "fadeUp 0.15s ease both" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{g.t}</div>
                  <div style={{ color: "rgba(255,255,255,0.8)" }}>{g.d}</div>
                  <div style={{ position: "absolute", top: "100%", left: 16, width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `5px solid ${C.navy}` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CTACard({ ct }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={ct.onClick}
      style={{ padding: "22px 16px", borderRadius: 12, background: "rgba(255,255,255,0.96)", cursor: ct.onClick ? "pointer" : "default", textAlign: "center", boxShadow: hov ? "0 16px 40px rgba(0,0,0,0.18)" : "0 4px 12px rgba(0,0,0,0.08)", transform: hov ? "translateY(-5px)" : "none", transition: "all 0.25s ease" }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: ct.ibg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 4px 10px rgba(0,0,0,0.15)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="2"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, fontFamily: "'Unbounded',sans-serif", marginBottom: 6, lineHeight: 1.3 }}>{ct.t}</div>
      <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{ct.d}</div>
    </div>
  );
}

function ExpandingCTA({ onBlueprint }) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && entry.intersectionRatio >= 0.85) setExpanded(true); }, { threshold: 0.85 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  const ctaItems = [
    { ibg: "linear-gradient(145deg,#186132,#148C59)", t: "Full UX Diagnosis + PDF",  d: "Scored audit across UX, industry & content branding. Download and share." },
    { ibg: "linear-gradient(145deg,#818CF8,#5B61F4)", t: "Conversion Blueprint",      d: "Every finding pinned to your page with AI-ready fix prompts.", onClick: onBlueprint },
    { ibg: "linear-gradient(145deg,#14D571,#148C59)", t: "Pulse Tracker",             d: "Chrome & Edge extension. Check off fixes as you go." },
  ];
  return (
    <div ref={ref} style={{ borderRadius: 16, background: "linear-gradient(135deg,#186132,#14D571)", boxShadow: "0 8px 32px rgba(20,140,89,0.2)", marginBottom: 0 }}>
      {!expanded ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>💜</span>
            <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 14, fontWeight: 700, color: "#fff" }}>You're all set.</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Your audit pack is ready.</div>
          </div>
          <button onClick={() => setExpanded(true)} style={{ padding: "9px 20px", borderRadius: 9, background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontFamily: "'Unbounded',sans-serif", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Get your pack →</button>
        </div>
      ) : (
        <div style={{ padding: "28px", textAlign: "center", animation: "fadeUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>💜</div>
          <h2 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>You're all set.</h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", margin: "0 0 20px" }}>Your full audit pack is ready to go.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, maxWidth: 680, margin: "0 auto" }}>
            {ctaItems.map((ct, i) => <CTACard key={i} ct={ct} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FullReport({ auditId }: { auditId: string }) {
  const { auditRow, findings, loading, error } = useAuditData(auditId);

  // ── Derived data ───────────────────────────────────────────────────
  const nonManual = findings.filter(f => !Boolean(f.manual_review ?? f.manualReview));
  const displayFindings = nonManual.filter(f => !f.pass);
  const passingChecks = nonManual.filter(f => f.pass);
  const baseScore = typeof auditRow?.score === "number" ? Math.round(auditRow.score) : 0;

  const cats = [
    { name: "Copy & Messaging",     score: calcCatScore(nonManual.filter(f => (f.check_id || "").startsWith("C"))) },
    { name: "CTA Effectiveness",    score: calcCatScore(nonManual.filter(f => ["A1.4","A5.1","A5.2","A5.3","A5.4"].includes(f.check_id))) },
    { name: "Trust & Social Proof", score: calcCatScore(nonManual.filter(f => ["A4.1","A4.6"].includes(f.check_id))) },
    { name: "Layout & Hierarchy",   score: calcCatScore(nonManual.filter(f => ["A1.6","A3.2","A7.2"].includes(f.check_id))) },
    { name: "Technical Readiness",  score: calcCatScore(nonManual.filter(f => (f.check_id || "").startsWith("A7"))) },
  ];

  // ── Finding states ─────────────────────────────────────────────────
  const [states, setStates] = useState<Record<string, string>>({});
  useEffect(() => {
    setStates(prev => {
      const next = { ...prev };
      displayFindings.forEach(f => { if (!next[f.id]) next[f.id] = "unread"; });
      return next;
    });
  }, [displayFindings.length]);

  const [projectedScore, setProjectedScore] = useState(baseScore);
  const [scoreAnim, setScoreAnim] = useState(false);
  useEffect(() => { setProjectedScore(baseScore); }, [baseScore]);

  const setState = (id: string, s: string) => {
    setStates(prev => {
      const next = { ...prev, [id]: s };
      const recovery = Object.entries(next).reduce((acc, [k, v]) => {
        const f = displayFindings.find(f => f.id === k);
        if (!f) return acc;
        const pts = SEV_RECOVERY[f.severity] ?? 2;
        if (v === "done") return acc + pts;
        if (v === "in-progress") return acc + Math.round(pts * 0.4);
        return acc;
      }, 0);
      setProjectedScore(Math.min(100, baseScore + recovery));
      setScoreAnim(true);
      setTimeout(() => setScoreAnim(false), 600);
      return next;
    });
  };

  // ── UI state ───────────────────────────────────────────────────────
  const [filter, setFilter] = useState("all");
  const [wsTab, setWsTab] = useState("findings");
  const [showAllPassed, setShowAllPassed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeF = displayFindings.find(f => f.id === activeId) || null;
  const openFinding = (id: string) => setActiveId(a => a === id ? null : id);

  // ── Counts ─────────────────────────────────────────────────────────
  const criticals = displayFindings.filter(f => f.severity === "critical");
  const majors    = displayFindings.filter(f => f.severity === "major");
  const minors    = displayFindings.filter(f => f.severity === "minor");
  const done  = Object.values(states).filter(s => s === "done").length;
  const total = displayFindings.length;
  const pct   = total ? Math.round(done / total * 100) : 0;

  const filtered = displayFindings.filter(f => {
    const part = (f.check_id || "").charAt(0).toUpperCase();
    if (filter === "all")      return part !== "C";
    if (filter === "Critical") return f.severity === "critical" && part !== "C";
    if (filter === "Major")    return f.severity === "major"    && part !== "C";
    if (filter === "Minor")    return f.severity === "minor"    && part !== "C";
    if (["A","B","C"].includes(filter)) return part === filter;
    return true;
  });

  // ── Revenue metrics ────────────────────────────────────────────────
  const mobileDropoff = getMobileDropoff(nonManual);
  const trustFailing  = ["A4.1","A4.3","A4.5"].filter(id => nonManual.some(f => f.check_id === id && !f.pass)).length;
  const friction = Math.min(40, 15 + ["C4.1","C4.2","A3.1"].filter(id => nonManual.some(f => f.check_id === id && !f.pass)).length * 7);
  const atRisk = getAtRisk(baseScore, criticals.length);

  // ── Content tab ────────────────────────────────────────────────────
  const cs = (ids: string[]) => calcCatScore(nonManual.filter(f => ids.includes(f.check_id)));
  const contentTiles = [
    { label: "Brand Voice",         score: cs(["C1.1","C1.2","C1.3","C1.4"]), verdict: "Voice consistency and tone across your page copy." },
    { label: "Messaging Hierarchy", score: cs(["C2.1","C2.2","C2.3"]),        verdict: "How clearly your value prop is communicated at each section." },
    { label: "Positioning Clarity", score: cs(["C3.1","C3.2","C3.3"]),        verdict: "How well you differentiate from alternatives." },
    { label: "CTA Copy Quality",    score: cs(["A5.1","A5.2","A5.3"]),        verdict: "Persuasiveness and specificity of your conversion actions." },
  ];
  const contentFindings = displayFindings.filter(f => (f.check_id || "").charAt(0).toUpperCase() === "C");

  // ── Benchmarks ─────────────────────────────────────────────────────
  const industry = (auditRow?.industry || "saas").toLowerCase();
  const bench = BENCHMARKS[industry] || BENCHMARKS.saas;
  const domain = auditRow?.domain || "yoursite.com";

  const goToBlueprint = () => {
    window.history.pushState({}, "", `/blueprint/${auditId}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  // ── Guards ─────────────────────────────────────────────────────────
  if (loading && !auditRow) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 44, height: 44, borderRadius: "50%", border: `4px solid rgba(20,140,89,0.2)`, borderTop: `4px solid ${C.emerald}`, animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }
  if (error && !auditRow) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.navy, fontFamily: "'Space Grotesk',sans-serif" }}>
        {error}
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Space Grotesk',sans-serif", position: "relative" }}>
      <style>{KEYFRAMES}</style>
      <style>{`@media print{body{background:#fff!important}nav{display:none!important}[style*="position:sticky"],[style*="position: sticky"]{position:relative!important;top:auto!important;z-index:auto!important;box-shadow:none!important}}`}</style>
      <Blobs />
      <Nav />

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 28px 24px" }}>
        <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 26, fontWeight: 700, color: C.navy, letterSpacing: "-0.5px", margin: "0 0 4px" }}>
          Your{" "}<span style={{ background: "linear-gradient(90deg,#186132,#14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>UXpact</span>
        </h1>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Everything we found, broken down by severity.</p>
      </div>

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 28px 40px", position: "relative", zIndex: 10, display: "flex", gap: 20, alignItems: "start" }}>

        {/* ── SIDEBAR ──────────────────────────────────────────────── */}
        <div style={{ width: 210, flexShrink: 0, position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 12, paddingBottom: 64 }}>

          <div style={{ ...glass, padding: "18px 14px", textAlign: "center" }}>
            <ArcGauge score={projectedScore} animated={scoreAnim} size="normal" key={scoreAnim ? projectedScore : 0} />
            {projectedScore > baseScore && (
              <div style={{ marginTop: 6, fontSize: 11, color: C.emerald, fontWeight: 600, animation: "countUp 0.4s ease both" }}>+{projectedScore - baseScore} pts projected</div>
            )}
            <div style={{ marginTop: 8, fontSize: 10, fontWeight: 600, color: C.dim, textTransform: "uppercase", letterSpacing: "0.6px" }}>{domain} · {industry}</div>
            <div style={{ height: 3, borderRadius: 2, background: "rgba(0,0,0,0.06)", overflow: "hidden", margin: "8px 0 4px" }}>
              <div style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg,${C.forest},${C.mint})`, width: `${pct}%`, transition: "width 0.6s ease" }} />
            </div>
            <div style={{ fontSize: 10, color: C.muted }}>{pct}% complete · {done}/{total} addressed</div>
          </div>

          <div style={{ ...glass, padding: 14 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: C.dim, marginBottom: 8 }}>Severity</div>
            {([["all","All findings",null,displayFindings.length],["Critical","Critical","#EF4444",criticals.length],["Major","Major","#F59E0B",majors.length],["Minor","Minor","#EAB308",minors.length]] as const).map(([v,l,dot,cnt]) => (
              <button key={v} onClick={() => setFilter(v)}
                style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "7px 9px", borderRadius: 8, border: "none", background: filter === v ? "rgba(20,140,89,0.1)" : "transparent", cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, color: filter === v ? C.forest : C.muted, fontWeight: filter === v ? 600 : 400, transition: "all 0.18s", marginBottom: 2, textAlign: "left" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot || C.dim, flexShrink: 0 }} />
                {l}<span style={{ marginLeft: "auto", fontSize: 10, background: "rgba(0,0,0,0.06)", borderRadius: 10, padding: "1px 6px" }}>{cnt}</span>
              </button>
            ))}
            <div style={{ height: 1, background: "rgba(0,0,0,0.05)", margin: "8px 0" }} />
            <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: C.dim, marginBottom: 8 }}>Area</div>
            {(["A","B","C"] as const).map((v, i) => {
              const labels = ["Structure & Conv.","Performance & Trust","Content Branding"];
              const bgs = ["rgba(20,140,89,0.1)","rgba(91,97,244,0.1)","rgba(11,28,72,0.07)"];
              const cols = [C.emerald, C.violet, C.navy];
              return (
                <button key={v} onClick={() => setFilter(v)}
                  style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "7px 9px", borderRadius: 8, border: "none", background: filter === v ? "rgba(20,140,89,0.1)" : "transparent", cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, color: filter === v ? C.forest : C.muted, fontWeight: filter === v ? 600 : 400, transition: "all 0.18s", marginBottom: 2, textAlign: "left" }}>
                  <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: bgs[i], color: cols[i] }}>{v}</span>{labels[i]}
                </button>
              );
            })}
          </div>

          <div style={{ background: "rgba(91,97,244,0.06)", border: "1px solid rgba(91,97,244,0.15)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.mint, animation: "pulseAnim 2s infinite" }} />
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: C.violet }}>Pulse Tracker</div>
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: C.navy, marginBottom: 3 }}>{done} / {total} items addressed</div>
            <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>Install the browser extension to track fixes on your live site.</div>
          </div>
        </div>

        {/* ── MAIN ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Card 1 — Diagnosis + CatScores + Benchmarks (not sticky) */}
          <div style={{ ...cardBgs[0], borderRadius: 16, padding: "28px 28px 20px", marginBottom: 16, animation: "fadeUp 0.4s ease 0s both", boxShadow: "0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ padding: "4px 11px", borderRadius: 5, background: "#D1FAE5", color: C.navy, fontSize: 11.5, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif" }}>{domain}</span>
              <span style={{ padding: "4px 11px", borderRadius: 5, background: "#E0E7FF", color: C.navy, fontSize: 11.5, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif" }}>{industry}</span>
            </div>
            <div style={{ height: 1, background: "rgba(0,0,0,0.05)", marginBottom: 20 }} />
            <div style={{ borderRadius: 12, padding: "20px 22px", background: "linear-gradient(135deg,#186132 0%,#148C59 60%,#14D571 100%)", marginBottom: 20 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>Primary Diagnosis</div>
              <p style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", lineHeight: 1.6, margin: "0 0 8px" }}>
                {baseScore < 40 ? "Your site has critical conversion blockers that need immediate attention. Fix the red items first."
                  : baseScore < 60 ? "Decent structure — but your copy isn't converting, and your CTA is asking before it's earned the click."
                  : "Strong foundation. A few refinements will push your conversion rate further."}
              </p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, margin: 0 }}>
                {criticals.length} critical {criticals.length === 1 ? "issue" : "issues"}, {majors.length} major, {minors.length} minor across {displayFindings.length} total findings. {passingChecks.length} checks passing.
              </p>
              <CatScores cats={cats} />
            </div>
            <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: C.dim, marginBottom: 12 }}>Industry Benchmark — {bench.label}</div>
              {([["Your score", baseScore, C.violet], ["Industry avg", bench.avg, C.muted], ["Top quartile", bench.top, C.emerald]] as const).map(([l, v, col], i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < 2 ? 8 : 0, fontSize: 12 }}>
                  <span style={{ width: 96, color: C.muted, flexShrink: 0 }}>{l}</span>
                  <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, background: col, width: `${v}%`, transition: "width 1.2s ease" }} />
                  </div>
                  <span style={{ width: 24, textAlign: "right", fontWeight: 700, color: col, fontSize: 12 }}>{v}</span>
                </div>
              ))}
              <p style={{ fontSize: 11, color: C.dim, marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>
                {baseScore < bench.avg
                  ? `You're ${bench.avg - baseScore} points below the industry average. The top-quartile gap is ${bench.top - baseScore} points.`
                  : `You're ${baseScore - bench.avg} points above the industry average.`}
              </p>
            </div>
          </div>

          {/* Card 2 — Revenue Leak (sticky) */}
          <div style={{ position: "sticky", top: 20, zIndex: 11, ...cardBgs[1], borderRadius: 16, padding: "28px", marginBottom: 16, animation: "fadeUp 0.4s ease 0.1s both", boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 18, fontWeight: 700, color: C.navy, margin: "0 0 4px" }}>Revenue Leak</h2>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 6px" }}>Here's what these issues are likely costing you.</p>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: C.navy, margin: "0 0 18px" }}>Estimated <span style={{ color: C.forest }}>{atRisk}</span> at risk based on these findings.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 14 }}>
              {[
                { pct: `~${mobileDropoff}%`, label: "mobile drop-off",        desc: "Exit before CTA appears. Above-fold fix lifts conversion by 28–47%.",       color: C.forest  },
                { pct: `${trustFailing}/3`,  label: "trust signals missing",   desc: trustFailing > 0 ? "Missing signals reduce conversion by up to 2–3×." : "Strong trust coverage — keep it prominent.", color: C.violet  },
                { pct: `~${friction}%`,      label: "copy friction",           desc: "Conversion lift missed from feature-led vs benefit-led headlines.",          color: C.emerald },
              ].map((r, i) => (
                <div key={i} style={{ padding: "20px 16px", borderRadius: 12, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.9)", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", animation: `fadeUp 0.3s ease ${i * 0.07}s both` }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: r.color, fontFamily: "'Unbounded',sans-serif", marginBottom: 4 }}>{r.pct}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{r.desc}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 10.5, color: C.dim, margin: 0 }}>Estimates based on CRO benchmarks · Actual impact varies by traffic and industry.</p>
          </div>

          {/* Card 3 — Findings with tabs (sticky) */}
          <div style={{ position: "sticky", top: 20, zIndex: 20, borderRadius: 16, marginBottom: 16, background: "#EEF1F5", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            {activeF && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(255,255,255,0.6)", borderRadius: "16px 16px 0 0", animation: "fadeUp 0.2s ease both" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.navy, flex: 1, marginRight: 12 }}>{activeF.name}</div>
                  <button onClick={() => setActiveId(null)} style={{ fontSize: 10, padding: "2px 9px", borderRadius: 20, background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", color: C.muted, flexShrink: 0 }}>Close ✕</button>
                </div>
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, margin: "0 0 8px" }}>{activeF.finding}</p>
                <button onClick={goToBlueprint} style={{ padding: "6px 14px", borderRadius: 20, background: C.emerald, color: "#fff", border: "none", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif" }}>Open Blueprint →</button>
              </div>
            )}
            <div style={{ padding: "6px", display: "flex", gap: 3, borderRadius: activeF ? "0" : "16px 16px 0 0" }}>
              {(["findings","content","working"] as const).map((v, i) => {
                const labels = ["All Findings","Content Branding","What's Working"];
                return (
                  <button key={v} onClick={() => setWsTab(v)}
                    style={{ flex: 1, padding: "9px 12px", borderRadius: 9, border: "none", background: wsTab === v ? "#fff" : "transparent", color: wsTab === v ? C.forest : C.muted, fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, fontWeight: wsTab === v ? 700 : 400, cursor: "pointer", transition: "all 0.18s ease", boxShadow: wsTab === v ? "0 2px 6px rgba(0,0,0,0.12)" : "none" }}>{labels[i]}</button>
                );
              })}
            </div>
            <div style={{ padding: "16px", maxHeight: "calc(100vh - 160px)", overflowY: "auto" }}>
              {wsTab === "findings" && (
                <div style={{ paddingBottom: 80 }}>
                  {filtered.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 13 }}>No findings match this filter.</div>}
                  {filtered.map((f, i) => (
                    <div key={f.id} style={{ animation: `fadeUp 0.25s ease ${i * 0.05}s both` }}>
                      <FindingCard f={f} state={states[f.id] || "unread"} onState={s => setState(f.id, s)} active={activeId === f.id} onOpen={openFinding} />
                    </div>
                  ))}
                </div>
              )}
              {wsTab === "content" && (
                <div style={{ paddingBottom: 80 }}>
                  <p style={{ fontSize: 11.5, color: C.muted, margin: "0 0 12px", lineHeight: 1.4 }}>How your copy, voice, and messaging hold up — the layer most audits skip entirely.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {contentTiles.map((item, i) => <CBTile key={i} item={item} delay={i * 0.07} />)}
                  </div>
                  <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: 10 }}>
                    {contentFindings.length === 0
                      ? <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>No content branding findings for this audit.</p>
                      : contentFindings.map((f, i) => (
                          <div key={f.id} style={{ animation: `fadeUp 0.2s ease ${i * 0.06}s both` }}>
                            <FindingCard f={f} state={states[f.id] || "unread"} onState={s => setState(f.id, s)} active={activeId === f.id} onOpen={openFinding} />
                          </div>
                        ))}
                  </div>
                </div>
              )}
              {wsTab === "working" && (
                <div>
                  <p style={{ fontSize: 13, color: C.muted, margin: "0 0 14px", lineHeight: 1.5 }}>These aren't just nice to have — they're real conversion assets you should protect.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {(showAllPassed ? passingChecks : passingChecks.slice(0, 8)).map((f, i) => (
                      <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", background: "rgba(20,213,113,0.04)", border: "1px solid rgba(20,213,113,0.1)", borderRadius: 9, fontSize: 12, color: C.navy, fontWeight: 500, animation: `fadeUp 0.22s ease ${i * 0.04}s both` }}>
                        <div style={{ width: 20, height: 20, borderRadius: 6, background: "#14D571", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 6px rgba(20,213,113,0.3)" }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        {f.name}
                      </div>
                    ))}
                  </div>
                  {!showAllPassed && passingChecks.length > 8 && (
                    <button onClick={() => setShowAllPassed(true)} style={{ marginTop: 12, background: "none", border: "none", color: C.emerald, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                      + {passingChecks.length - 8} more
                    </button>
                  )}
                  <GlossaryStrip />
                </div>
              )}
            </div>
          </div>

          {/* Card 4 — UX Pro upsell (sticky) */}
          <div style={{ position: "sticky", top: 36, zIndex: 30, borderRadius: 16, padding: "24px 28px", marginBottom: 16, background: "#EDEDFA", border: "1px solid rgba(91,97,244,0.12)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 15, fontWeight: 700, color: C.navy }}>UX Pro</div>
              <div style={{ fontSize: 9, fontWeight: 700, background: "rgba(91,97,244,0.1)", color: C.violet, borderRadius: 20, padding: "3px 10px", letterSpacing: "0.04em" }}>Next tier</div>
            </div>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 18px", lineHeight: 1.5 }}>Deeper features available in the next tier.</p>
            {[
              { icon: "🔄", title: "Re-audit & Regression Tracking", tier: "Pro",        desc: "Re-run the full audit after making changes. See what improved, what regressed, and what new issues surfaced." },
              { icon: "✨", title: "UXpact Vision",                  tier: "Pro",        desc: "A fully redesigned version of your site with every audit finding applied — improved structure, rewritten copy." },
              { icon: "🔌", title: "Design Tool Plugins",            tier: "Pro Add-on", desc: "Findings surfaced contextually in Figma, Framer, Webflow, WordPress, and more — without leaving your tool." },
            ].map((f, i) => (
              <div key={i}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(91,97,244,0.1)", marginBottom: i < 2 ? 10 : 0, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", animation: `fadeUp 0.25s ease ${i * 0.08}s both`, transition: "all 0.22s ease" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}>
                <div style={{ fontSize: 24, flexShrink: 0 }}>{f.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: C.navy }}>{f.title}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, background: "rgba(91,97,244,0.1)", color: C.violet, borderRadius: 20, padding: "2px 9px" }}>{f.tier}</div>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{f.desc}</div>
                </div>
                <div style={{ fontSize: 20, color: C.dim, flexShrink: 0 }}>→</div>
              </div>
            ))}
          </div>

          {/* Card 5 — ExpandingCTA (sticky) */}
          <div style={{ position: "sticky", top: 52, zIndex: 40, marginBottom: 0 }}>
            <ExpandingCTA onBlueprint={goToBlueprint} />
          </div>

          <div style={{ textAlign: "center", padding: "24px 0 40px" }}>
            <p style={{ fontSize: 11, color: C.dim, margin: 0 }}>{domain} · Audit #{auditId} · {formatDate(auditRow?.created_at)} · UXpact © 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
