// @ts-nocheck
import { useEffect, useState } from "react";
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

function ExpandingCTA({ onBlueprint }) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && entry.intersectionRatio >= 0.85) setExpanded(true); }, { threshold: 0.85 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  const ctaItems = [
    { ibg: "linear-gradient(145deg,#186132,#148C59)", t: "Full UX Diagnosis + PDF", d: "Scored audit across UX, industry & content branding. Download and share." },
    { ibg: "linear-gradient(145deg,#818CF8,#5B61F4)", t: "Conversion Blueprint", d: "Every finding pinned to your page with AI-ready fix prompts.", onClick: onBlueprint },
    { ibg: "linear-gradient(145deg,#14D571,#148C59)", t: "Pulse Tracker", d: "Chrome & Edge extension. Check off fixes as you go." },
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
            {ctaItems.map((ct, i) => {
              const [hov, setHov] = useState(false);
              return (
                <div key={i} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={ct.onClick}
                  style={{ padding: "22px 16px", borderRadius: 12, background: "rgba(255,255,255,0.96)", border: "none", cursor: ct.onClick ? "pointer" : "default", textAlign: "center", boxShadow: hov ? "0 16px 40px rgba(0,0,0,0.18)" : "0 4px 12px rgba(0,0,0,0.08)", transform: hov ? "translateY(-5px)" : "none", transition: "all 0.25s ease" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: ct.ibg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 4px 10px rgba(0,0,0,0.15)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="2"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, fontFamily: "'Unbounded',sans-serif", marginBottom: 6, lineHeight: 1.3 }}>{ct.t}</div>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{ct.d}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Placeholder export (stage 3 will replace this) ─────────────────────
export default function FullReport({ auditId }: { auditId: string }) {
  const { auditRow, findings, loading, error } = useAuditData(auditId);

  if (loading && !auditRow) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", border: `4px solid rgba(20,140,89,0.2)`, borderTop: `4px solid ${C.emerald}`, animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Space Grotesk',sans-serif" }}>
      <style>{KEYFRAMES}</style>
      <Blobs />
      <Nav />
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "40px 28px", color: C.navy }}>
        <p style={{ margin: 0 }}>Stage 1 complete — data loaded. auditId: {auditId}, score: {auditRow?.score}, findings: {findings.length}</p>
      </div>
    </div>
  );
}
