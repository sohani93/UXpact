// @ts-nocheck
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const C = {
  bg: "#EEF1F5",
  forest: "#186132", emerald: "#148C59", mint: "#14D571",
  violet: "#5B61F4", navy: "#0B1C48",
  textMuted: "#6B7280", textDim: "#9CA3AF",
  red: "#DC2626", amber: "#F97316", yellow: "#EAB308",
};
const cardBgs = [
  { background: "rgba(255,255,255,0.65)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.7)" },
  { background: "linear-gradient(160deg, rgba(20,213,113,0.09) 0%, rgba(255,255,255,0.55) 100%)", backdropFilter: "blur(24px)", border: "1px solid rgba(20,213,113,0.12)" },
  { background: "linear-gradient(160deg, rgba(91,97,244,0.07) 0%, rgba(255,255,255,0.55) 100%)", backdropFilter: "blur(24px)", border: "1px solid rgba(91,97,244,0.1)" },
];
const bgOrder = [0, 1, 2, 0, 1, 2, 0];
const MIN_H = 420;
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
let SCORE = 58;
let CATEGORIES = [
  { name: "Copy & Messaging", score: 45 }, { name: "CTA Effectiveness", score: 65 },
  { name: "Trust & Social Proof", score: 70 }, { name: "Layout & Hierarchy", score: 52 },
  { name: "Technical Readiness", score: 40 },
];
let CRITICAL = [
  { title: "Hero copy lacks a clear value proposition", body: 'Your H1 reads: "Powerful analytics for modern teams." This describes the tool — not the outcome for the user.', terms: ["Value Proposition", "CTA Blindness"] },
  { title: "Primary CTA not visible above fold on mobile", body: 'Your "Get Started" button appears 1,420px down the page. On a 375px screen that\'s nearly 4 scrolls away.', terms: ["Above the Fold", "Conversion Friction"] },
  { title: "Page asks for action before building desire", body: 'Your "Start Free Trial" CTA appears in section 2. Your value explanation doesn\'t begin until section 4.', terms: ["Persuasion Sequence"] },
];
let MAJOR = [
  { title: "No social proof in the first viewport", body: "0 testimonials, 0 trust logos, 0 customer counts. Visitors have no reason to trust you before signing up.", terms: ["Social Proof"] },
  { title: "Heading structure skips levels — H1 jumps to H4", body: "After your H1, the next heading is an H4. H2 and H3 are missing entirely." },
  { title: "No low-risk entry point for SaaS visitors", body: 'Your only CTA is "Start Free Trial" — no demo, no preview, no "see how it works."' },
  { title: "Meta description missing", body: "No meta description tag found. Search engines will auto-generate a snippet — usually poorly." },
  { title: "Body copy is feature-led, not benefit-led", body: "14 mentions of features, 2 mentions of user outcomes. Readers aren't seeing themselves in the copy." },
];
let MINOR = [
  { title: "3 images missing alt text", body: "hero-image.png, team-photo.jpg, and product-screenshot.webp have no alt attributes." },
  { title: "Logo not linked to homepage", body: "Your header logo has no anchor tag. Users expect to click it to return home." },
  { title: "OG image tag missing", body: "No og:image meta tag. Shared links will have no preview image." },
  { title: 'Copy uses "we" language throughout', body: '23 instances of "we/our/us", 4 of "you". High-converting copy talks to the reader.' },
];
let PASSED = ["SSL / HTTPS confirmed", "Viewport meta tag present", "Single H1 tag — heading structure starts correctly", "Favicon detected", "Navigation links present in header", "Schema / JSON-LD detected", "External links open in new tab", "Font loading optimised", "No render-blocking scripts", "Page weight under 3MB", "No broken internal links", "Touch targets meet minimum 48px"];
let PULSE_ITEMS = [
  { text: "Rewrite H1 with outcome-led copy", sev: "Critical", emoji: "🔴" },
  { text: "Move CTA above fold on mobile", sev: "Critical", emoji: "🔴" },
  { text: "Restructure: context → desire → action", sev: "Critical", emoji: "🔴" },
  { text: "Add trust signals in first viewport", sev: "Major", emoji: "🟠" },
  { text: "Fix heading hierarchy — add H2 after H1", sev: "Major", emoji: "🟠" },
];
const getScoreColor = (s) => s >= 70 ? C.mint : s >= 40 ? C.emerald : C.forest;
const getSevBadge = (s) => {
  if (s >= 80) return { label: "Strong", bg: "#D1FAE5", color: C.emerald };
  if (s >= 60) return { label: "Decent", bg: "#E0E7FF", color: C.violet };
  if (s >= 40) return { label: "Needs Work", bg: "#FEF3C7", color: "#D97706" };
  return { label: "Critical", bg: "#FEE2E2", color: C.red };
};
const GLOSSARY = {
  "Value Proposition": "The main reason a visitor should choose your product over alternatives.",
  "CTA Blindness": "When users overlook calls-to-action due to poor placement, styling, or timing.",
  "Above the Fold": "Content visible without scrolling on initial page load.",
  "Conversion Friction": "Any element that slows or prevents a user from completing a desired action.",
  "Persuasion Sequence": "The order in which information is presented to guide a visitor toward a decision.",
  "Social Proof": "Evidence that others trust or use your product — reviews, logos, customer counts.",
};

function Pill({ text, variant }) {
  const base = { padding: "4px 11px", borderRadius: 5, border: "none", fontSize: 11.5, whiteSpace: "nowrap", fontFamily: "'Space Grotesk',sans-serif", display: "inline-block" };
  if (variant === "green") return <span style={{ ...base, background: "#D1FAE5", color: C.navy, fontWeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>{text}</span>;
  if (variant === "violet") return <span style={{ ...base, background: "#E0E7FF", color: C.navy, fontWeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>{text}</span>;
  return null;
}
function SevPill({ label, bg, color }) {
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, color, background: bg, fontFamily: "'Space Grotesk',sans-serif" }}>{label}</span>;
}
function GlossaryTerm({ term }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span onClick={() => setShow(!show)} style={{ fontSize: 10.5, fontWeight: 600, color: C.violet, padding: "2px 8px", borderRadius: 4, background: "rgba(91,97,244,0.08)", cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif", whiteSpace: "nowrap" }}>{term} ⓘ</span>
      {show && GLOSSARY[term] && (
        <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 4, padding: "8px 12px", borderRadius: 8, background: "#fff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 11, color: C.navy, lineHeight: 1.4, width: 220, zIndex: 200 }}><b>{term}</b>: {GLOSSARY[term]}</div>
      )}
    </span>
  );
}
function FindingCard({ f }) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: 10, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize: 13.5, fontWeight: 650, color: C.navy, marginBottom: 6 }}>{f.title}</div>
      <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginBottom: f.terms ? 8 : 0 }}>{f.body}</div>
      {f.terms && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{f.terms.map((t, i) => <GlossaryTerm key={i} term={t} />)}</div>}
    </div>
  );
}
function GreenCheck() {
  return (
    <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(145deg, #34D399, #10B981)", boxShadow: "0 2px 4px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
  );
}

/* BIGGER arc gauge — radius 130, SVG 320×195 */
function ArcGauge() {
  const r = 130, sw = 11, cx = 160, cy = 162;
  const pol = (rad, a) => ({ x: cx + rad * Math.cos(a * Math.PI / 180), y: cy + rad * Math.sin(a * Math.PI / 180) });
  const s = pol(r, 180), e = pol(r, 360);
  const bgArc = `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`;
  const arcLen = Math.PI * r; const frac = SCORE / 100; const sc = getScoreColor(SCORE); const sev = getSevBadge(SCORE);
  const dot = pol(r, 180 + 180 * frac);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
      <svg width={320} height={195} viewBox="0 0 320 195">
        <defs>
          <linearGradient id="ag" x1="0%" y1="50%" x2="100%" y2="50%"><stop offset="0%" stopColor={C.forest} /><stop offset="50%" stopColor={C.emerald} /><stop offset="100%" stopColor={C.mint} /></linearGradient>
          <filter id="gl"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <path d={bgArc} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={sw} strokeLinecap="round" />
        <path d={bgArc} fill="none" stroke="url(#ag)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={arcLen} strokeDashoffset={arcLen * (1 - frac)} />
        <circle cx={dot.x} cy={dot.y} r={6} fill={sc} filter="url(#gl)" />
        <text x={cx} y={cy - 14} textAnchor="middle" style={{ fontSize: 56, fontWeight: 800, fill: sc, fontFamily: "'Unbounded',sans-serif", letterSpacing: "-2px" }}>{SCORE}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 11, fontWeight: 600, fill: C.textDim, letterSpacing: 2.5, textTransform: "uppercase", fontFamily: "'Space Grotesk',sans-serif" }}>UX Score</text>
      </svg>
      <div style={{ marginTop: -4, padding: "5px 18px", borderRadius: 20, background: sev.bg, fontSize: 12, fontWeight: 600, color: sev.color, fontFamily: "'Space Grotesk',sans-serif" }}>{sev.label}</div>
    </div>
  );
}
function CategoryBars() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, justifyContent: "center", minWidth: 0 }}>
      {CATEGORIES.map((cat, i) => {
        const c = getScoreColor(cat.score); const sev = getSevBadge(cat.score);
        return (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ fontSize: 12.5, fontWeight: 550, color: C.navy }}>{cat.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{cat.score}</span>
                <span style={{ fontSize: 9, fontWeight: 600, color: sev.color }}>{sev.label}</span>
              </div>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "rgba(0,0,0,0.05)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${C.forest}, ${c})`, width: `${cat.score}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
function SymbolIcon({ char, gradient }) {
  return (
    <div style={{ width: 44, height: 44, borderRadius: 12, background: gradient, boxShadow: "0 4px 10px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, color: "#fff", fontWeight: 700, margin: "0 auto 12px" }}>{char}</div>
  );
}
function CTABox({ children, bg, border, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onClick}
      style={{
        padding: "28px 20px", borderRadius: 14, background: bg, border, cursor: "pointer", textAlign: "center",
        boxShadow: hov ? "0 16px 40px rgba(0,0,0,0.18)" : "0 6px 20px rgba(0,0,0,0.08)",
        transform: hov ? "translateY(-6px)" : "translateY(0)",
        transition: "all 0.25s ease",
      }}>{children}</div>
  );
}
function StickyCard({ idx, children }) {
  const topOffset = 20 + idx * 16; /* standard offset */
  return (
    <div style={{
      position: "sticky", top: topOffset, zIndex: 10 + idx,
      ...cardBgs[bgOrder[idx]], borderRadius: 16,
      boxShadow: "0 8px 32px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.7)",
      padding: "36px 32px", marginBottom: 24, minHeight: MIN_H,
    }}>{children}</div>
  );
}

export default function FullReport({ auditId }: { auditId: string }) {
  const [showAllPassed, setShowAllPassed] = useState(false);
  const [auditRow, setAuditRow] = useState<any>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pulseCopied, setPulseCopied] = useState(false);

  const handlePulseSync = async () => {
    if (!auditId) return;
    try { await navigator.clipboard.writeText(String(auditId)); } catch {}
    setPulseCopied(true);
    setTimeout(() => setPulseCopied(false), 2500);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const calcCategoryScore = (items: any[]) => {
    if (!items.length) return 100;
    const passing = items.filter((item) => item.pass === true).length;
    return Math.round((passing / items.length) * 100);
  };

  const displayFindings = findings.filter((f) => !f.pass && !Boolean(f.manual_review ?? f.manualReview));
  const nonManualFindings = findings.filter((f) => !Boolean(f.manual_review ?? f.manualReview));
  const passingChecks = findings.filter((f) => f.pass && !Boolean(f.manual_review ?? f.manualReview));
  const categoryLabels: Record<string, string> = {
    "First Impression & Clarity": "First impression & clarity",
    "Navigation & Structure": "Navigation & structure",
    "Copy & Messaging": "Copy & messaging",
    "Trust & Social Proof": "Trust & social proof",
    "CTA & Conversion Design": "CTA effectiveness",
    "Layout & Visual Design": "Layout & visual design",
    "Technical Readiness": "Technical readiness",
    "Industry-Specific (SaaS)": "SaaS-specific checks",
    "Industry-Specific (Ecommerce)": "Ecommerce-specific checks",
    "Industry-Specific (Portfolio)": "Portfolio-specific checks",
    "Industry-Specific (Healthcare)": "Healthcare-specific checks",
    "Industry-Specific (Fintech)": "Fintech-specific checks",
    "Industry-Specific (Service)": "Service-specific checks",
    "Emotional Resonance": "Copy tone & resonance",
    "Copy-Design Alignment": "Copy-design alignment",
    "Brand Foundation": "Brand foundation",
    "Audience Fit": "Audience fit",
    "Positioning": "Positioning",
  };
  const passingByCategory = Object.entries(
    passingChecks.reduce((acc, f) => {
      if (!f.category) return acc;
      const label = categoryLabels[f.category] ?? f.category;
      if (!acc[label]) acc[label] = 0;
      acc[label]++;
      return acc;
    }, {} as Record<string, number>),
  );
  const flagged = displayFindings;
  const severityOrder = { critical: 0, major: 1, minor: 2 };
  const dedupeByName = (items: any[]) =>
    items.filter((item, index, arr) => arr.findIndex((entry) => entry.name === item.name) === index);
  const isFailing = (checkId: string) => displayFindings.some((f) => f.check_id === checkId && f.pass === false);

  SCORE = typeof auditRow?.score === "number" ? Math.round(auditRow.score) : 0;
  CATEGORIES = [
    { name: "Copy & Messaging", score: calcCategoryScore(nonManualFindings.filter((f) => (f.check_id || "").startsWith("C"))) },
    { name: "CTA Effectiveness", score: calcCategoryScore(nonManualFindings.filter((f) => ["A1.4", "A5.1", "A5.2", "A5.3", "A5.4"].includes(f.check_id))) },
    { name: "Trust & Social Proof", score: calcCategoryScore(nonManualFindings.filter((f) => ["A4.1", "A4.6"].includes(f.check_id))) },
    { name: "Layout & Hierarchy", score: calcCategoryScore(nonManualFindings.filter((f) => ["A1.6", "A3.2", "A7.2"].includes(f.check_id))) },
    { name: "Technical Readiness", score: calcCategoryScore(nonManualFindings.filter((f) => (f.check_id || "").startsWith("A7"))) },
  ];
  CRITICAL = dedupeByName(nonManualFindings
    .filter((f) => f.severity === "critical" && f.pass === false))
    .map((f) => ({ title: f.name, body: f.finding, terms: f.glossary_terms ?? [] }));
  MAJOR = dedupeByName(nonManualFindings
    .filter((f) => f.severity === "major" && f.pass === false))
    .map((f) => ({ title: f.name, body: f.finding, terms: f.glossary_terms ?? [] }));
  MINOR = dedupeByName(nonManualFindings
    .filter((f) => f.severity === "minor" && f.pass === false))
    .map((f) => ({ title: f.name, body: f.finding, terms: f.glossary_terms ?? [] }));
  PASSED = passingChecks.map((f) => f.name);
  PULSE_ITEMS = flagged
    .slice()
    .sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99))
    .map((f) => ({
      text: f.fix,
      sev: `${(f.severity || "").charAt(0).toUpperCase()}${(f.severity || "").slice(1)}`,
      emoji: f.severity === "critical" ? "🔴" : f.severity === "major" ? "🟠" : "🟡",
    }));
  let dropoff = 35;
  if (isFailing("A1.4")) dropoff += 12;
  if (isFailing("A5.2")) dropoff += 8;
  if (isFailing("A1.6")) dropoff += 8;
  if (isFailing("A3.2")) dropoff += 5;
  dropoff = Math.min(65, dropoff);
  dropoff = Math.round(dropoff / 5) * 5;

  const trustFailing = ["A4.1", "A4.3", "A4.5"].filter((id) => isFailing(id)).length;

  let friction = 15;
  if (isFailing("C4.1")) friction += 9;
  if (isFailing("C4.2")) friction += 8;
  if (isFailing("A3.1")) friction += 6;
  friction = Math.min(40, friction);

  const revenueLeaks = [
    {
      numericPart: `~${dropoff}%`,
      textPart: null,
      label: "mobile drop-off",
      desc: "of mobile visitors exit before your CTA appears. CTA above fold lifts conversion by 28–47%.",
      color: C.forest,
      emoji: dropoff >= 50 ? "🔴" : dropoff >= 35 ? "🟠" : "🟡",
    },
    {
      numericPart: trustFailing > 0 ? `${trustFailing}/3` : "3/3",
      textPart: trustFailing > 0 ? "trust signals missing" : "trust signals present",
      label: "trust coverage",
      desc: trustFailing > 0
        ? "Missing trust signals reduce conversion by up to 2–3×. Add testimonials, logos, and social proof above fold."
        : "Strong trust foundation. Keep testimonials, logos, and security signals prominent.",
      color: C.violet,
      emoji: trustFailing >= 2 ? "🔴" : trustFailing === 1 ? "🟠" : "🟢",
    },
    {
      numericPart: `~${friction}%`,
      textPart: null,
      label: "copy friction",
      desc: "conversion lift missed from feature-led vs benefit-led copy. Benefit-led headlines outperform feature-led by 18–32%.",
      color: C.emerald,
      emoji: friction >= 20 ? "🟠" : "🟡",
    },
  ];

  const criticalCount = displayFindings.filter((f) => f.severity === "critical" && !f.pass).length;
  const score = auditRow?.score;
  let atRisk = "£480/mo";
  if (score < 40 && criticalCount >= 3) atRisk = "£5,200/mo";
  else if (score < 60 && criticalCount >= 2) atRisk = "£2,800/mo";
  else if (score < 70 && criticalCount >= 1) atRisk = "£1,100/mo";

  const summaryCopy =
    SCORE < 40
      ? "Your site has critical conversion blockers. Fix the red items first."
      : SCORE <= 69
        ? "Decent structure — but your copy isn't converting, and your CTA is asking before it's earned the click."
        : "Strong foundation. A few refinements will push your conversion rate further.";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      const [{ data: auditsData, error: auditError }, { data: findingsData, error: findingsError }] = await Promise.all([
        supabase.from("audits").select("*").eq("id", auditId).maybeSingle(),
        supabase.from("audit_findings").select("*").eq("audit_id", auditId),
      ]);

      if (auditError || findingsError) {
        setError(auditError?.message || findingsError?.message || "Failed to load audit data.");
        setAuditRow(null);
        setFindings([]);
        setLoading(false);
        return;
      }

      if (!auditsData) {
        setError("Audit not found.");
        setAuditRow(null);
        setFindings([]);
        setLoading(false);
        return;
      }

      setAuditRow(auditsData);
      setFindings(findingsData ?? []);
      setLoading(false);
    };
    void load();
  }, [auditId]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk',sans-serif" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", border: "4px solid rgba(20,140,89,0.2)", borderTop: `4px solid ${C.emerald}` }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk',sans-serif", color: C.navy }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Space Grotesk',sans-serif", position: "relative" }}>
      <div style={{ position: "fixed", top: -100, left: -60, width: 480, height: 480, background: "radial-gradient(circle, rgba(20,213,113,0.10) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: 600, right: -80, width: 380, height: 380, background: "radial-gradient(circle, rgba(91,97,244,0.06) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
  @media print {
    body { background: #fff !important; }
    nav { display: none !important; }
    [style*="position: fixed"], [style*="position:fixed"] { display: none !important; }
    [style*="position: sticky"], [style*="position:sticky"] {
      position: relative !important;
      top: auto !important;
      z-index: auto !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      background: #fff !important;
      border: 1px solid #e5e7eb !important;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .cta-block { display: none !important; }
  }
`}</style>

      {/* PINNED NAV + HEADER */}
      {/* NAV + HEADER — normal flow, not sticky */}
      <nav style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", position: "relative", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#186132,#14D571)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(20,140,89,0.2)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" /></svg>
          </div>
          <span style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 16, fontWeight: 700, color: C.navy }}>UXpact</span>
        </div>
        <span style={{ fontSize: 13, color: C.emerald, fontWeight: 600, cursor: "pointer" }}>New Audit</span>
      </nav>
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 28px 24px" }}>
        <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 26, fontWeight: 700, color: C.navy, letterSpacing: "-0.5px", margin: "0 0 6px" }}>
          Your{" "}<span style={{ background: "linear-gradient(90deg,#186132,#14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Full Report</span>
        </h1>
        <p style={{ fontSize: 14, color: C.textMuted, margin: 0 }}>Everything we found, broken down by severity.</p>
      </div>

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 28px 40px", position: "relative", zIndex: 10 }}>

        {/* CARD 1 — Score */}
        <StickyCard idx={0}>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
            <Pill text={auditRow?.domain || "yoursite.com"} variant="green" /><Pill text="Signups" variant="green" /><Pill text="Demo requests" variant="violet" />
          </div>
          <div style={{ height: 1, background: "rgba(0,0,0,0.05)", marginBottom: 24 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "center" }}>
            <div style={{ display: "flex", justifyContent: "center" }}><ArcGauge /></div>
            <CategoryBars />
          </div>
          <p style={{ fontSize: 12.5, fontWeight: 500, color: C.textMuted, textAlign: "center", lineHeight: 1.5, margin: "20px 0 14px" }}>
            {summaryCopy}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
            {[{ dot: C.red, text: `${CRITICAL.length} Critical` }, { dot: C.amber, text: `${MAJOR.length} Major` }, { dot: C.yellow, text: `${MINOR.length} Minor` }, { dot: "#22C55E", text: `${PASSED.length} Passed` }].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: C.textMuted }}>{s.text}</span>
              </div>
            ))}
          </div>
        </StickyCard>

        {/* CARD 2 — Revenue Leak */}
        <StickyCard idx={1}>
          <h2 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 18, fontWeight: 700, color: C.navy, margin: "0 0 6px" }}>Revenue Leak</h2>
          <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 24px" }}>Here's what these issues are likely costing you.</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.navy, margin: "0 0 20px" }}>Estimated ~{atRisk} at risk based on these findings.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {revenueLeaks.map((r, i) => (
              <div key={i} style={{ padding: "28px 24px", borderRadius: 14, background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)", textAlign: "center", position: "relative", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
                {r.emoji && <div style={{ position: "absolute", top: 12, right: 14, fontSize: 12 }}>{r.emoji}</div>}
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: r.color, fontFamily: "'Unbounded',sans-serif" }}>{r.numericPart}</span>
                </div>
                {r.textPart ? (
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.navy, fontFamily: "'Space Grotesk',sans-serif", marginBottom: 10 }}>{r.textPart}</div>
                ) : (
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.navy, marginBottom: 10 }}>{r.label}</div>
                )}
                <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5 }}>{r.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: C.textDim, marginTop: 18, marginBottom: 0 }}>Estimated from CRO benchmarks · Actual impact varies by traffic & industry.</p>
        </StickyCard>

        {/* CARD 3 — Critical */}
        {CRITICAL.length > 0 && (
          <StickyCard idx={2}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>🔴 Critical</h2>
              <SevPill label={`${CRITICAL.length} findings`} bg="rgba(220,38,38,0.1)" color={C.red} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {CRITICAL.map((f, i) => <FindingCard key={i} f={f} />)}
            </div>
          </StickyCard>
        )}

        {/* CARD 4 — Major (2-col) */}
        {MAJOR.length > 0 && (
          <StickyCard idx={3}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>🟠 Major</h2>
              <SevPill label={`${MAJOR.length} findings`} bg="rgba(245,158,11,0.1)" color={C.amber} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {MAJOR.map((f, i) => <FindingCard key={i} f={f} />)}
            </div>
          </StickyCard>
        )}

        {/* CARD 5 — Minor (single col) */}
        {MINOR.length > 0 && (
          <StickyCard idx={4}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>🟡 Minor</h2>
              <SevPill label={`${MINOR.length} findings`} bg="rgba(234,179,8,0.18)" color={C.yellow} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MINOR.map((f, i) => <FindingCard key={i} f={f} />)}
            </div>
            {(() => {
              const allFindingText = findings.map(f => `${f.name ?? ""} ${f.finding ?? ""}`).join(" ");
              const activeTerms = Object.entries(GLOSSARY).filter(([term]) =>
                allFindingText.toLowerCase().includes(term.toLowerCase())
              );
              if (activeTerms.length === 0) return null;
              return (
                <details style={{ marginTop: 16, cursor: "pointer" }}>
                  <summary style={{ fontSize: 12, fontWeight: 600, color: C.textDim }}>Glossary — tap to expand</summary>
                  <div style={{ marginTop: 10, fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
                    {activeTerms.map(([term, def], i) => (
                      <div key={i} style={{ marginBottom: 4 }}><b>{term}</b> — {def}</div>
                    ))}
                  </div>
                </details>
              );
            })()}
          </StickyCard>
        )}

        {/* CARD 6 — What's Working (single col) */}
        <StickyCard idx={5}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>What's Working</h2>
            <SevPill label={`${passingChecks.length} passed`} bg="rgba(255,255,255,0.9)" color={C.emerald} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {passingByCategory.length === 0 && (
              <p style={{ fontSize: 12.5, color: C.textMuted, margin: 0 }}>
                Run a new audit to see categorised results.
              </p>
            )}
            {(showAllPassed ? passingByCategory : passingByCategory.slice(0, 8)).map(([categoryLabel, count], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.navy, fontWeight: 450 }}>
                <GreenCheck />
                <span>
                  {categoryLabel} <span style={{ fontSize: 11, color: "#9CA3AF" }}>· {count} {count === 1 ? "check" : "checks"}</span>
                </span>
              </div>
            ))}
            {!showAllPassed && passingByCategory.length > 8 && (
              <button onClick={() => setShowAllPassed(true)} style={{ marginTop: 8, gridColumn: "1 / -1", textAlign: "left", background: "none", border: "none", color: C.emerald, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>+ {passingByCategory.length - 8} more</button>
            )}
          </div>
        </StickyCard>

        {/* CARD 7 — Pulse Preview */}
        <StickyCard idx={6}>
          <h2 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 18, fontWeight: 700, color: C.navy, margin: "0 0 4px" }}>Your fix checklist is ready.</h2>
          <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 20px" }}>{flagged.length} items — synced to Pulse when you're ready to build.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PULSE_ITEMS.slice(0, 5).map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderRadius: 8, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, border: "2px solid rgba(0,0,0,0.12)", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.navy }}>{item.text}</span>
                </div>
                <span style={{ fontSize: 11, flexShrink: 0 }}>{item.emoji} <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.sev}</span></span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: C.textDim, marginTop: 14, marginBottom: 0 }}>+ {Math.max(flagged.length - 5, 0)} more items · available when you start Pulse</p>
          <div style={{ height: 1, background: "rgba(0,0,0,0.05)", margin: "14px 0" }} />
          <p style={{ fontSize: 11, color: C.textDim, margin: 0 }}>Audit ID #{auditId} · Enter this in Pulse to sync your checklist</p>
        </StickyCard>

        {/* CARD 8 — CTA */}
        <div className="cta-block" style={{
          position: "relative", zIndex: 17, borderRadius: 16, padding: "48px 36px",
          background: `linear-gradient(135deg, ${C.forest}, ${C.mint})`,
          boxShadow: "0 8px 32px rgba(20,140,89,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
          marginBottom: 24, textAlign: "center",
        }}>
          <h2 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 24, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>💜 You're all set.</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", margin: "0 0 32px" }}>Your audit pack is ready. Download your report, grab your fix prompts & start tracking!</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, maxWidth: 700, margin: "0 auto" }}>
            <CTABox bg="#E8F8ED" border="1px solid rgba(20,213,113,0.2)" onClick={() => window.print()}>
              <SymbolIcon char="↓" gradient="linear-gradient(145deg, #22C55E, #16A34A)" />
              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, fontFamily: "'Unbounded',sans-serif", marginBottom: 4 }}>Download PDF</div>
              <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>Save it, share it, hand it to your dev.</div>
            </CTABox>
            <CTABox bg="#EEEEFA" border="1px solid rgba(91,97,244,0.15)" onClick={() => {
              window.history.pushState({}, "", `/blueprint/${auditId}`);
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}>
              <SymbolIcon char="✦" gradient="linear-gradient(145deg, #818CF8, #5B61F4)" />
              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, fontFamily: "'Unbounded',sans-serif", marginBottom: 4 }}>Conversion Blueprint</div>
              <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>AI-ready fix prompts for Cursor, Claude Code, or Lovable.</div>
            </CTABox>
            <CTABox bg="#FFFFFF" border="1px solid rgba(0,0,0,0.06)" onClick={handlePulseSync}>
              <SymbolIcon char="◉" gradient="linear-gradient(145deg, #14D571, #148C59)" />
              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, fontFamily: "'Unbounded',sans-serif", marginBottom: 4 }}>
                {pulseCopied ? "ID Copied ✓" : "Start Pulse Tracker"}
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>
                {pulseCopied ? "Paste into the Pulse extension to sync." : "Track every fix as you go. Know when you're done."}
              </div>
            </CTABox>
          </div>
        </div>
      </div>
      <div style={{ textAlign: "center", padding: "20px 28px 40px", position: "relative", zIndex: 5 }}>
        <p style={{ fontSize: 11, color: C.textDim, margin: 0 }}>{auditRow?.domain || "yoursite.com"} · Audit #{auditId} · {formatDate(auditRow?.created_at)} · UXpact © 2026</p>
      </div>
    </div>
  );
}
