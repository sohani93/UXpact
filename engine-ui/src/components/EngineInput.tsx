import React, { useState } from "react";
import type { AuditRequestFormData } from "../lib/ui-types";

const INDUSTRIES = [
  { value: "saas", label: "SaaS / Software" },
  { value: "ecommerce", label: "Ecommerce" },
  { value: "portfolio", label: "Portfolio / Personal" },
  { value: "healthcare", label: "Healthcare / Wellness" },
  { value: "fintech", label: "Fintech / Finance" },
  { value: "service", label: "Service / Agency" },
];
const REVIEW_FOCUS = ["Scroll Behavior", "CTA Placement", "Copy Clarity", "Visual Hierarchy", "Responsiveness", "Overall"];
const PAGE_GOALS = ["Lead gen", "Signups", "Bookings", "Sales", "Demo requests", "Brand awareness"];

type EngineInputProps = {
  onSubmit: (formData: AuditRequestFormData) => void;
  initialForm?: AuditRequestFormData;
};

export default function EngineInput({ onSubmit, initialForm }: EngineInputProps) {
  const [name, setName] = useState(initialForm?.name ?? "");
  const [email, setEmail] = useState(initialForm?.email ?? "");
  const [url, setUrl] = useState(initialForm?.url ?? "");
  const [pageGoals, setPageGoals] = useState<string[]>(initialForm?.goal ? [initialForm.goal] : []);
  const [industry, setIndustry] = useState(initialForm?.industry ?? "");
  const [challenge, setChallenge] = useState(2);
  const [reviewFocus, setReviewFocus] = useState<string[]>(initialForm?.focusAreas ?? []);
  const [hoveredBtn, setHoveredBtn] = useState(false);

  const toggleGoal = (g: string) => setPageGoals((p) => p.includes(g) ? p.filter((x) => x !== g) : [...p, g]);
  const toggleFocus = (f: string) => setReviewFocus((p) => p.includes(f) ? p.filter((x) => x !== f) : [...p, f]);
  const isReady = name && email && url && industry;

  // Dark theme tokens ported directly from the approved mockup's :root
  // variables (--canvas/--surface/--ink/--forest/--mint/--violet), kept as
  // local constants rather than importing workspace-dark.css so this
  // component stays self-contained exactly as it was before — no shared
  // stylesheet, no risk of its dark rules leaking outside this page.
  const T = {
    canvas: "#060509", surface: "rgba(255,255,255,0.045)", surface2: "rgba(255,255,255,0.07)",
    ink: "#F3F1FA", inkSoft: "#B7B2CC", inkDim: "#79749A", line: "rgba(255,255,255,0.09)",
    forest: "#1F8C4C", mint: "#14D571", violet: "#7B7FFF", violetSoft: "rgba(123,127,255,0.14)",
  } as const;
  const glass = {
    background: T.surface, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
    borderRadius: 14, border: `1px solid ${T.line}`,
    boxShadow: "0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)",
  } as const;
  const inp = {
    width: "100%", height: 42, borderRadius: 8, border: `1px solid ${T.line}`,
    padding: "0 13px", fontSize: 13, color: T.ink, background: T.surface2,
    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 400, outline: "none",
    transition: "all 0.2s", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)",
  };
  const oF = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.target.style.borderColor = "rgba(20,213,113,0.5)"; e.target.style.background = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "0 0 0 3px rgba(20,213,113,0.12)"; };
  const oB = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.target.style.borderColor = T.line; e.target.style.background = T.surface2; e.target.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.15)"; };
  const lbl = { display: "block", fontSize: 12, fontWeight: 500, color: T.inkSoft, marginBottom: 6, fontFamily: "'Space Grotesk', sans-serif" } as const;
  const cTitle = (icon: React.ReactNode, text: string) => (
    <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 660, color: "#fff", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 24, height: 24, borderRadius: 6, background: `linear-gradient(135deg, ${T.forest}, ${T.mint})`, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      {text}
    </div>
  );
  const UrgencySlider = () => {
    const labels = ["Just curious", "Minor tweaks", "Some friction", "Real problems", "Nothing converts"];
    return (
      <div>
        <div
          style={{ position: "relative", height: 22, marginBottom: 10, cursor: "pointer" }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            setChallenge(Math.round(pct * 4));
          }}
        >
          <div style={{
            position: "absolute", top: "50%", left: 0, right: 0,
            height: 6, transform: "translateY(-50%)", borderRadius: 3,
            background: "linear-gradient(90deg, #14D571 0%, #148C59 50%, #5B61F4 100%)",
          }} />
          <div style={{
            position: "absolute", top: "50%", transform: "translateY(-50%)",
            left: `calc(${10 + challenge * 20}% - 11px)`,
            width: 22, height: 22, borderRadius: "50%",
            background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            pointerEvents: "none", transition: "left 0.15s",
          }} />
        </div>
        <div style={{ display: "flex" }}>
          {labels.map((l, i) => (
            <span key={i} onClick={() => setChallenge(i)} style={{
              flex: 1, fontSize: 10.5, textAlign: "center", cursor: "pointer",
              color: challenge === i ? "#fff" : "#79749A",
              fontWeight: challenge === i ? 600 : 400, transition: "all 0.2s",
            }}>{l}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.canvas, fontFamily: "'Space Grotesk', sans-serif", position: "relative", overflow: "hidden",
      backgroundImage:
        "radial-gradient(ellipse 900px 640px at 10% -8%, rgba(123,127,255,0.22), transparent 60%)," +
        "radial-gradient(ellipse 700px 520px at 105% 22%, rgba(20,213,113,0.10), transparent 55%)," +
        "radial-gradient(ellipse 1000px 760px at 45% 115%, rgba(74,63,191,0.28), transparent 62%)",
      backgroundAttachment: "fixed",
    }}>
      <nav style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}><div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${T.forest}, ${T.mint})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(20,140,89,0.2)" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" /></svg></div><span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 16, fontWeight: 700, color: "#fff" }}>UXpact</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>{["Home", "Audits"].map((t) => (<span key={t} style={{ fontSize: 13, color: T.inkDim, fontWeight: 450, cursor: "pointer" }}>{t}</span>))}<span style={{ fontSize: 13, color: T.mint, fontWeight: 600, cursor: "pointer" }}>New Audit</span></div>
      </nav>

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "8px 28px 60px", position: "relative", zIndex: 10 }}>
        <div style={{ marginBottom: 24 }}><h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", margin: "0 0 6px" }}>Configure Your <span style={{ background: `linear-gradient(90deg, ${T.forest}, ${T.mint})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Audit</span></h1><p style={{ fontSize: 14, color: T.inkSoft, margin: 0, fontWeight: 400 }}>Fill in the details below and we'll analyze your site instantly.</p></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 290px", gap: 16, alignItems: "stretch" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ ...glass, padding: "24px" }}>
              {cTitle(<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#14D571" strokeWidth="1.5" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" stroke="#14D571" strokeWidth="1.5" /></svg>, "Drop Your Details")}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Who is this audit for? *</label><input type="text" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} style={inp} onFocus={oF} onBlur={oB} /></div>
                <div><label style={lbl}>Best email to contact you? *</label><input type="email" placeholder="jane@company.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} onFocus={oF} onBlur={oB} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><label style={lbl}>Drop your site link *</label><input type="url" placeholder="https://yoursite.com" value={url} onChange={(e) => setUrl(e.target.value)} style={inp} onFocus={oF} onBlur={oB} /></div>
                <div><label style={lbl}>What type of site is this? *</label>
                  <select value={industry} onChange={(e) => setIndustry(e.target.value)} style={{ ...inp, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23B7B2CC' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 28, color: industry ? T.ink : T.inkDim }} onFocus={oF} onBlur={oB}><option value="" disabled style={{ color: "#79749A" }}>Select site type...</option>{INDUSTRIES.map((i) => <option key={i.value} value={i.value} style={{ color: "#F3F1FA" }}>{i.label}</option>)}</select>
                </div>
              </div>
            </div>
            <div style={{ ...glass, padding: "24px", flex: 1 }}>
              {cTitle(<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" stroke="#14D571" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" stroke="#14D571" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>, "Your Focus Area")}
              <div style={{ marginBottom: 20 }}><label style={{ ...lbl, marginBottom: 8 }}>What is this page supposed to do?</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 14px", borderRadius: 10, background: T.surface2, border: `1px solid ${T.line}`, boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)", minHeight: 46 }}>{PAGE_GOALS.map((goal) => { const sel = pageGoals.includes(goal); return (<div key={goal} onClick={() => toggleGoal(goal)} style={{ padding: "5px 14px", borderRadius: 6, background: sel ? T.mint : "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", transition: "all 0.15s", fontSize: 12.5, fontWeight: sel ? 600 : 450, color: sel ? "#06210F" : T.inkSoft, whiteSpace: "nowrap" }}>{goal}</div>);})}</div></div>
              <div style={{ marginBottom: 22 }}><label style={{ ...lbl, marginBottom: 10 }}>How urgent is the problem?</label><UrgencySlider /></div>
              <div style={{ marginBottom: 22 }}><label style={{ ...lbl, marginBottom: 10 }}>What would you like reviewed?</label><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>{REVIEW_FOCUS.map((item) => { const ch = reviewFocus.includes(item); return (<div key={item} onClick={() => toggleFocus(item)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.line}`, background: "rgba(255,255,255,0.03)", cursor: "pointer", transition: "all 0.15s" }}><div style={{ width: 16, height: 16, borderRadius: 4, border: ch ? "none" : `1.5px solid ${T.inkDim}`, background: ch ? `linear-gradient(135deg, ${T.forest}, ${T.mint})` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>{ch && <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}</div><span style={{ fontSize: 12.5, fontWeight: 450, color: T.inkSoft, whiteSpace: "nowrap" }}>{item}</span></div>);})}</div></div>
              <button disabled={!isReady} onClick={() => onSubmit({ name, email, url, industry, goal: pageGoals[0] ?? "", challenge: String(challenge), focusAreas: reviewFocus })} onMouseEnter={() => setHoveredBtn(true)} onMouseLeave={() => setHoveredBtn(false)} style={{ width: "100%", height: 48, borderRadius: 10, border: "none", background: isReady ? (hoveredBtn ? `linear-gradient(135deg, ${T.violet}, #9B9FFF)` : `linear-gradient(135deg, ${T.forest}, ${T.mint})`) : "rgba(255,255,255,0.06)", color: isReady ? "#fff" : T.inkDim, fontFamily: "'Unbounded', sans-serif", fontSize: 14, fontWeight: 660, cursor: isReady ? "pointer" : "not-allowed", transition: "all 0.3s", boxShadow: isReady ? (hoveredBtn ? "0 8px 28px rgba(123,127,255,0.4)" : "0 3px 12px rgba(20,213,113,0.2)") : "none", transform: isReady && hoveredBtn ? "translateY(-1px)" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>Run My Audit{isReady && <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-7-7l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}</button>
              <div style={{ textAlign: "center", fontSize: 11, color: T.inkDim, marginTop: 10, fontWeight: 400 }}>Free during beta &middot; Full reports from &pound;X/audit after launch</div>
            </div>
          </div>
          <div style={{ ...glass, padding: "22px 18px", display: "flex", flexDirection: "column" }}>{cTitle(<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="#14D571" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>, "Your Audit Pack")}<div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>{[{ lbl: "Fix with context", lc: T.violet, bg: T.violetSoft, t: "Conversion Blueprint", d: "Every finding pinned to your page — plus a generative rebuild you can pick, preview, and deploy live", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="#7B7FFF" strokeWidth="1.5" strokeLinecap="round"/><path d="M9 12l2 2 4-4" stroke="#7B7FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },{ lbl: "Track your fixes", lc: T.mint, bg: "rgba(20,213,113,0.14)", t: "Pulse Tracker", d: "Chrome & Edge extension - check off fixes on your live site", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#14D571" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="#14D571" strokeWidth="1.5"/></svg> }].map((p, i) => (<div key={i} style={{ padding: "18px 16px", borderRadius: 10, background: p.bg, border: `1px solid ${T.line}`, flex: 1, display: "flex", alignItems: "flex-start", gap: 12 }}><div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{p.icon}</div><div><div style={{ fontSize: 10, fontWeight: 600, color: p.lc, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{p.lbl}</div><div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 12, fontWeight: 660, color: "#fff", marginBottom: 4, lineHeight: 1.3 }}>{p.t}</div><div style={{ fontSize: 11.5, color: T.inkSoft, lineHeight: 1.45 }}>{p.d}</div></div></div>))}</div></div>
        </div>
      </div>
      <style>{`* { box-sizing: border-box; margin: 0; } body { margin: 0; } ::placeholder { color: #79749A; font-family: 'Space Grotesk', sans-serif; font-weight: 400; } select { font-family: 'Space Grotesk', sans-serif; } select option { background: #16141F; }`}</style>
    </div>
  );
}
