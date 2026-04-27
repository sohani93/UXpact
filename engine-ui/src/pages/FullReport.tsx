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

// ── Placeholder export (stages 2+ will replace this) ──────────────────
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
