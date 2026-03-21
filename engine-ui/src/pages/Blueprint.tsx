// @ts-nocheck
import { useEffect, useState } from "react";

const C = {
  bg: "#EEF1F5",
  navy: "#0B1C48",
  forest: "#186132",
  emerald: "#148C59",
  mint: "#14D571",
  violet: "#5B61F4",
  muted: "#6B7280",
  dim: "#9CA3AF",
  border: "rgba(0,0,0,0.07)",
};

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

const FINDINGS = [
  {
    id: 1, zone: "hero", sev: "Critical",
    title: "Hero copy is feature-led, not benefit-led",
    fix: `Your H1 reads: "Powerful analytics for modern teams" — this describes the product, not the outcome for the user. Visitors decide within 5 seconds whether to stay. Rewrite to lead with what they gain: clarity, speed, confidence, revenue.`,
    prompt: `Rewrite this H1 and subheadline to be benefit-led.\n\nCurrent H1: "Powerful analytics for modern teams"\nCurrent sub: "Track, measure, and optimise your product with real-time data."\n\nRequirements:\n- Lead with the user outcome, not the product feature\n- Use "you" language throughout\n- H1 under 10 words\n- Subheadline makes the benefit concrete\n- Tone: direct, confident, no jargon`,
  },
  {
    id: 2, zone: "hero", sev: "Critical",
    title: "Single high-commitment CTA — no low-risk entry point",
    fix: `"Start Free Trial" asks for full commitment from cold traffic. Most first-time visitors aren't ready. Add a secondary CTA — "See a 2-min demo" or "Explore features" — to give hesitant visitors a lower-stakes next step alongside the primary action.`,
    prompt: `Add a secondary CTA alongside "Start Free Trial" on the hero section.\n\nThe secondary CTA should:\n- Offer a lower-commitment action (demo, product tour, or explainer)\n- Be visually subordinate (outline style vs filled primary)\n- Reduce commitment anxiety with its copy\n- Sit inline with the primary button\n\nWrite 3 copy options and the HTML for both buttons side by side.`,
  },
  {
    id: 3, zone: "features", sev: "Major",
    title: "Feature cards use 'we' language throughout",
    fix: `Every card opens with "We built..." or "Our engine..." — centering the company, not the user. Rewrite each card so "you" is the subject: what you see, what you get, what you can do. Applies to both titles and body copy.`,
    prompt: `Rewrite these 3 feature card titles and bodies from "we" to "you" language.\n\nCard 1: "Real-time dashboards — We built our dashboards to give you instant visibility."\nCard 2: "Custom reports — Our reporting engine lets your team generate any report."\nCard 3: "Team collaboration — We designed collaboration features so your whole team stays aligned."\n\nFor each:\n- Title names the user outcome, not what was built\n- Body uses "you" or "your team" as subject\n- Same approximate length`,
  },
  {
    id: 4, zone: "social", sev: "Major",
    title: "Social proof section has no testimonial quotes or outcome data",
    fix: `Logo badges alone don't convert — people trust other people, not brand marks. Add 2–3 short testimonial quotes with specific outcomes alongside the logo row. "We reduced reporting time by 60%" lands harder than any logo.`,
    prompt: `Write 3 customer testimonial quotes for the social proof section.\n\nFormat: one sentence each, max 15 words, written as a direct quote with name and role.\nEach quote should:\n- Name a specific measurable outcome\n- Sound like a real product manager or founder\n- Avoid marketing speak — specific and authentic`,
  },
  {
    id: 5, zone: "pricing", sev: "Major",
    title: "Pricing section reveals cost before establishing value",
    fix: `The section jumps straight to plan names and dollar amounts. Cold visitors see "$99/month" before understanding what they get back. Add 1–2 sentences anchoring the value before the pricing grid — reference time saved or a specific outcome.`,
    prompt: `Write a value anchor to appear above the pricing grid.\n\nCurrent header: "Simple, transparent pricing"\nMissing: any ROI or outcome framing before price reveal.\n\nWrite 2 options (1–2 sentences, max 25 words each) that:\n- Reference a specific outcome or time-to-value before price\n- Reduce price anxiety by contextualising cost against benefit\n- Feel factual and earned, not salesy`,
  },
  {
    id: 6, zone: "cta2", sev: "Minor",
    title: "Bottom CTA repeats hero ask without handling objections",
    fix: `"Ready to get started?" mirrors the hero CTA without adding anything new. By this point the user has seen the full page — they need a reason to act NOW. Address the most common objection ("Is it hard to set up?") before the button.`,
    prompt: `Rewrite the bottom CTA section to handle the setup objection.\n\nCurrent: "Ready to get started? Join thousands of teams already using our platform."\n\nMost common objection: "Is it complicated? Will I need engineering help?"\n\nWrite revised heading + subtext + CTA button label that:\n- Addresses setup simplicity directly\n- Uses existing social proof\n- Ends with a more specific CTA than "Start Free Trial"`,
  },
  {
    id: 7, zone: "nav", sev: "Minor",
    title: "Nav CTA has no visual distinction from nav links",
    fix: `"Get Started" in the nav carries the same visual weight as plain nav links. It reads as navigation, not a conversion action. Give it a distinct button treatment — filled or outlined — so the eye is naturally drawn to it.`,
    prompt: `Write CSS and HTML to style the nav CTA "Get Started" as a visually distinct button.\n\nRequirements:\n- Clearly differentiated from plain text nav links\n- Doesn't overpower the nav — subtle but clickable\n- Works on a light-background nav bar\n- Modern SaaS aesthetic\n- Include hover state`,
  },
];

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

// ── Pin ───────────────────────────────────────────────────────────────
function Pin({ finding, active, onClick }) {
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
          background: active ? s.color : s.dot,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
          boxShadow: hov || active ? `0 3px 10px rgba(0,0,0,0.22)` : `0 2px 6px rgba(0,0,0,0.13)`,
          transition: "all 0.15s",
          transform: active ? "scale(1.18)" : hov ? "scale(1.1)" : "none",
          filter: active ? "brightness(0.88)" : "none",
          opacity: 1,
        }}>
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: "#fff",
          fontFamily: "'Space Grotesk', sans-serif",
          lineHeight: 1, userSelect: "none",
        }}>{finding.id}</span>
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
function FixDrawer({ finding, findingIndex, onClose }) {
  const [copied, setCopied] = useState(false);
  const sev = SEV[finding.sev];
  const fixBg = FIX_TAB_BG[findingIndex % FIX_TAB_BG.length];

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
            <div style={{
              display: "inline-block", fontSize: 9, fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: sev.color, background: "rgba(255,255,255,0.7)",
              padding: "2px 8px", borderRadius: 10, marginBottom: 6,
              fontFamily: "'Space Grotesk', sans-serif",
            }}>{finding.sev}</div>
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
          <button onClick={copy} title="Copy prompt" style={{
            background: copied ? "linear-gradient(135deg, #186132, #14D571)" : "rgba(255,255,255,0.75)",
            border: copied ? "none" : `1px solid ${fixBg.border}`,
            borderRadius: 8, width: 30, height: 30,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.2s", flexShrink: 0,
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
        }}>{finding.prompt}</div>
      </div>

      <div style={{ padding: "10px 16px", borderTop: `1px solid ${fixBg.border}` }}>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 12, color: C.muted, fontFamily: "'Space Grotesk', sans-serif",
          display: "flex", alignItems: "center", gap: 4,
        }}>← Back to page</button>
      </div>
    </div>
  );
}

// ── Fac helpers ───────────────────────────────────────────────────────
const FacSection = ({ children, style = {}, borderBottom = true }) => (
  <div style={{ padding: "26px 32px", borderBottom: borderBottom ? `1px solid ${C.border}` : "none", position: "relative", ...style }}>
    {children}
  </div>
);
const FacLabel = ({ t }) => (
  <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.1em", color: C.dim, textTransform: "uppercase", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 5 }}>{t}</div>
);
const FacH2 = ({ children }) => (
  <div style={{ fontSize: 17, fontWeight: 650, color: C.navy, fontFamily: "'Unbounded', sans-serif", letterSpacing: "-0.3px", marginBottom: 8 }}>{children}</div>
);

// ── PinRow ────────────────────────────────────────────────────────────
function PinRow({ zone, activeId, setActiveId }) {
  const zf = FINDINGS.filter(f => f.zone === zone);
  if (!zf.length) return null;
  return (
    <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
      {zf.map(f => (
        <Pin key={f.id} finding={f}
          active={activeId === f.id}
          onClick={() => setActiveId(activeId === f.id ? null : f.id)} />
      ))}
    </div>
  );
}

// ── Pulse Footer ──────────────────────────────────────────────────────
function PulseFooter() {
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
            Ready to fix?
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Pulse tracks every step.
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
  const [auditData, setAuditData] = useState<any>(null);
  useEffect(() => {
    const load = async () => {
      const cached = sessionStorage.getItem(`audit:${auditId}`);
      if (cached) { try { setAuditData(JSON.parse(cached)); return; } catch {} }
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!anon) return;
      const res = await fetch(`https://oxminualycvnxofoevjs.supabase.co/rest/v1/audits?id=eq.${auditId}&select=*`, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } });
      if (!res.ok) return;
      const rows = await res.json();
      if (rows?.[0]) setAuditData(rows[0]);
    };
    void load();
  }, [auditId]);

  const activeFinding = FINDINGS.find(f => f.id === activeId) || null;
  const activeFindingIndex = activeFinding ? FINDINGS.indexOf(activeFinding) : 0;

  const pinProps = { activeId, setActiveId };

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
          <h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 26, fontWeight: 700, color: C.navy, letterSpacing: "-0.5px", margin: "0 0 6px" }}>
            Your{" "}
            <span style={{ background: "linear-gradient(90deg, #186132, #14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Conversion Blueprint
            </span>
          </h1>
          <p style={{ fontSize: 14, color: C.muted, margin: 0, fontWeight: 400 }}>
            Every finding mapped to your page — with fixes and AI prompts ready to copy.
          </p>
        </div>

        {/* ── Pills row + severity counts ──────────────────────────── */}
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 28px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ text: "yoursite.com", v: "green" }, { text: "Signups", v: "green" }, { text: "Demo requests", v: "violet" }].map((p, i) => (
              <Pill key={i} text={p.text} v={p.v} />
            ))}
          </div>
          {/* Severity counts — right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {[
              { sev: "Critical", count: 2, dot: "#EF4444" },
              { sev: "Major",    count: 3, dot: "#F59E0B" },
              { sev: "Minor",    count: 2, dot: "#EAB308" },
            ].map(({ sev, count, dot }) => (
              <div key={sev} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.navy, fontFamily: "'Space Grotesk', sans-serif" }}>{count}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: C.navy, fontFamily: "'Space Grotesk', sans-serif" }}>{sev}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Hint — right-aligned, directly below severity row, zero top gap */}
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 28px 12px", display: "flex", justifyContent: "flex-end" }}>
          <span style={{ fontSize: 11, color: C.dim, fontFamily: "'Space Grotesk', sans-serif" }}>Click a pin to see the fix + AI prompt</span>
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
                https://yoursite.com
              </div>
            </div>

            {/* Site NAV */}
            <FacSection style={{ padding: "13px 28px", background: "rgba(255,255,255,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 14, fontWeight: 700, color: C.navy }}>YourSite</span>
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  {["Home","Features","Pricing","Blog"].map(l => (
                    <span key={l} style={{ fontSize: 12, color: C.muted, fontFamily: "'Space Grotesk', sans-serif" }}>{l}</span>
                  ))}
                  <span style={{ fontSize: 12, color: C.muted, fontFamily: "'Space Grotesk', sans-serif", padding: "4px 14px", border: `1px solid ${C.border}`, borderRadius: 20 }}>Get Started</span>
                </div>
              </div>
              <PinRow zone="nav" {...pinProps} />
            </FacSection>

            {/* HERO */}
            <FacSection style={{ textAlign: "center", padding: "44px 48px 36px", background: "linear-gradient(180deg, rgba(209,250,229,0.1) 0%, transparent 100%)" }}>
              <div style={{ fontSize: 27, fontWeight: 700, color: C.navy, fontFamily: "'Unbounded', sans-serif", letterSpacing: "-0.5px", lineHeight: 1.25, marginBottom: 12 }}>
                Powerful analytics for modern teams
              </div>
              <div style={{ fontSize: 13.5, color: C.muted, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 22, maxWidth: 420, margin: "0 auto 22px" }}>
                Track, measure, and optimise your product with real-time data.
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ padding: "9px 26px", background: "linear-gradient(135deg, #186132, #148C59)", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
                  Start Free Trial
                </div>
              </div>
              <PinRow zone="hero" {...pinProps} />
            </FacSection>

            {/* FEATURES */}
            <FacSection>
              <FacLabel t="Features" />
              <FacH2>Everything you need to understand your users</FacH2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 11, marginTop: 14 }}>
                {[
                  { t: "Real-time dashboards", b: "We built our dashboards to give you instant visibility across all your key metrics." },
                  { t: "Custom reports",       b: "Our reporting engine lets your team generate any report you need." },
                  { t: "Team collaboration",   b: "We designed collaboration features so your whole team stays aligned." },
                ].map((c, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.55)", border: `1px solid ${C.border}`, borderRadius: 9, padding: "13px 14px" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 650, color: C.navy, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>{c.t}</div>
                    <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, fontFamily: "'Space Grotesk', sans-serif" }}>{c.b}</div>
                  </div>
                ))}
              </div>
              <PinRow zone="features" {...pinProps} />
            </FacSection>

            {/* SOCIAL PROOF */}
            <FacSection style={{ background: "rgba(224,231,255,0.07)" }}>
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
            <FacSection>
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
            <FacSection style={{ textAlign: "center", background: "linear-gradient(135deg, rgba(24,97,50,0.04), rgba(91,97,244,0.03))" }}>
              <FacH2>Ready to get started?</FacH2>
              <div style={{ fontSize: 13, color: C.muted, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 20 }}>Join thousands of teams already using our platform.</div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ padding: "9px 26px", background: "linear-gradient(135deg, #186132, #148C59)", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
                  Start Free Trial
                </div>
              </div>
              <PinRow zone="cta2" {...pinProps} />
            </FacSection>

            {/* FOOTER */}
            <FacSection borderBottom={false} style={{ padding: "14px 28px", background: "rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: C.dim, fontFamily: "'Space Grotesk', sans-serif" }}>© 2026 YourSite</span>
                <div style={{ display: "flex", gap: 14 }}>
                  {["Privacy","Terms","Contact"].map(l => (
                    <span key={l} style={{ fontSize: 11, color: C.dim, fontFamily: "'Space Grotesk', sans-serif" }}>{l}</span>
                  ))}
                </div>
              </div>
            </FacSection>
          </div>

          {/* ── Fix Drawer (sticky) ───────────────────────────────── */}
          {activeFinding && (
            <div style={{ position: "sticky", top: 20 }}>
              <FixDrawer
                finding={activeFinding}
                findingIndex={activeFindingIndex}
                onClose={() => setActiveId(null)}
              />
            </div>
          )}
        </div>

        {/* Audit ID — centered directly below facsimile, no gap */}
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "8px 28px 24px", textAlign: "center" }}>
          <span style={{ fontSize: 11, color: C.dim, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.06em" }}>Audit #{auditId}</span>
        </div>

        {/* ── Pulse footer — lean green gradient pill ───────────── */}
        <PulseFooter />
      </div>
    </div>
  );
}
