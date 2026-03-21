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

  const glass = {
    background: "rgba(255,255,255,0.5)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
    borderRadius: 14, border: "1px solid rgba(255,255,255,0.65)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.7)",
  } as const;
  const inp = {
    width: "100%", height: 42, borderRadius: 8, border: "1px solid rgba(0,0,0,0.07)",
    padding: "0 13px", fontSize: 13, color: "#0B1C48", background: "rgba(255,255,255,0.55)",
    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 400, outline: "none",
    transition: "all 0.2s", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
  };
  const oF = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.target.style.borderColor = "rgba(22,163,74,0.4)"; e.target.style.background = "rgba(255,255,255,0.85)"; e.target.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.07)"; };
  const oB = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.target.style.borderColor = "rgba(0,0,0,0.07)"; e.target.style.background = "rgba(255,255,255,0.55)"; e.target.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.03)"; };
  const lbl = { display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6, fontFamily: "'Space Grotesk', sans-serif" } as const;
  const cTitle = (icon: React.ReactNode, text: string) => (
    <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 660, color: "#0B1C48", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg, rgba(20,140,89,0.1), rgba(20,213,113,0.05))", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      {text}
    </div>
  );
  const urg = ["Just curious", "Minor tweaks", "Some friction", "Real problems", "Nothing converts"];

  return (
    <div style={{ minHeight: "100vh", background: "#EEF1F5", fontFamily: "'Space Grotesk', sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -100, left: -60, width: 480, height: 480, background: "radial-gradient(circle, rgba(20,213,113,0.10) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 300, right: -80, width: 380, height: 380, background: "radial-gradient(circle, rgba(91,97,244,0.06) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -60, left: "30%", width: 400, height: 350, background: "radial-gradient(circle, rgba(20,140,89,0.06) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

      <nav style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}><div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #186132, #14D571)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(20,140,89,0.2)" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" /></svg></div><span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 16, fontWeight: 700, color: "#0B1C48" }}>UXpact</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>{["Home", "Audits"].map((t) => (<span key={t} style={{ fontSize: 13, color: "#6B7280", fontWeight: 450, cursor: "pointer" }}>{t}</span>))}<span style={{ fontSize: 13, color: "#148C59", fontWeight: 600, cursor: "pointer" }}>New Audit</span></div>
      </nav>

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "8px 28px 60px", position: "relative", zIndex: 10 }}>
        <div style={{ marginBottom: 24 }}><h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 26, fontWeight: 700, color: "#0B1C48", letterSpacing: "-0.5px", margin: "0 0 6px" }}>Configure Your <span style={{ background: "linear-gradient(90deg, #186132, #14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Audit</span></h1><p style={{ fontSize: 14, color: "#6B7280", margin: 0, fontWeight: 400 }}>Fill in the details below and we'll analyze your site instantly.</p></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 290px", gap: 16, alignItems: "stretch" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ ...glass, padding: "24px" }}>
              {cTitle(<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#148C59" strokeWidth="1.5" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" stroke="#148C59" strokeWidth="1.5" /></svg>, "Drop Your Details")}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Who is this audit for? *</label><input type="text" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} style={inp} onFocus={oF} onBlur={oB} /></div>
                <div><label style={lbl}>Best email to contact you? *</label><input type="email" placeholder="jane@company.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} onFocus={oF} onBlur={oB} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><label style={lbl}>Drop your site link *</label><input type="url" placeholder="https://yoursite.com" value={url} onChange={(e) => setUrl(e.target.value)} style={inp} onFocus={oF} onBlur={oB} /></div>
                <div><label style={lbl}>What type of site is this? *</label>
                  <select value={industry} onChange={(e) => setIndustry(e.target.value)} style={{ ...inp, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 28, color: industry ? "#0B1C48" : "#9CA3AF" }} onFocus={oF} onBlur={oB}><option value="" disabled>Select site type...</option>{INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}</select>
                </div>
              </div>
            </div>
            <div style={{ ...glass, padding: "24px", flex: 1 }}>
              {cTitle(<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" stroke="#148C59" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" stroke="#148C59" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>, "Your Focus Area")}
              <div style={{ marginBottom: 20 }}><label style={{ ...lbl, marginBottom: 8 }}>What is this page supposed to do?</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(245,246,248,0.8)", border: "1px solid rgba(0,0,0,0.04)", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.04), 0 1px 0 rgba(255,255,255,0.7)", minHeight: 46 }}>{PAGE_GOALS.map((goal) => { const sel = pageGoals.includes(goal); return (<div key={goal} onClick={() => toggleGoal(goal)} style={{ padding: "5px 14px", borderRadius: 6, background: sel ? (["Lead gen","Bookings","Brand awareness"].includes(goal) ? "#D1FAE5" : "#E0E7FF") : "rgba(255,255,255,0.85)", border: "none", cursor: "pointer", transition: "all 0.15s", fontSize: 12.5, fontWeight: sel ? 600 : 450, color: sel ? "#0B1C48" : "#6B7280", whiteSpace: "nowrap", boxShadow: sel ? "0 1px 3px rgba(0,0,0,0.06)" : "0 1px 2px rgba(0,0,0,0.03)" }}>{goal}</div>);})}</div></div>
              <div style={{ marginBottom: 22 }}><label style={{ ...lbl, marginBottom: 10 }}>How urgent is the problem?</label><div style={{ padding: "0 2px" }}><input type="range" min="0" max="4" step="1" value={challenge} onChange={(e) => setChallenge(parseInt(e.target.value))} className="uxpact-slider" style={{ width: "100%", height: 6, outline: "none", cursor: "pointer", margin: 0 }} /><div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>{urg.map((l, i) => (<span key={i} style={{ fontSize: 10.5, color: challenge === i ? "#0B1C48" : "#9CA3AF", fontWeight: challenge === i ? 600 : 400, textAlign: "center", flex: 1, transition: "all 0.2s" }}>{l}</span>))}</div></div></div>
              <div style={{ marginBottom: 22 }}><label style={{ ...lbl, marginBottom: 10 }}>What would you like reviewed?</label><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>{REVIEW_FOCUS.map((item) => { const ch = reviewFocus.includes(item); return (<div key={item} onClick={() => toggleFocus(item)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)", background: "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.15s" }}><div style={{ width: 16, height: 16, borderRadius: 4, border: ch ? "none" : "1.5px solid #BFC5CE", background: ch ? "linear-gradient(135deg, #16a34a, #22c55e)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>{ch && <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}</div><span style={{ fontSize: 12.5, fontWeight: 450, color: "#4B5563", whiteSpace: "nowrap" }}>{item}</span></div>);})}</div></div>
              <button disabled={!isReady} onClick={() => onSubmit({ name, email, url, industry, goal: pageGoals[0] ?? "", challenge: String(challenge), focusAreas: reviewFocus })} onMouseEnter={() => setHoveredBtn(true)} onMouseLeave={() => setHoveredBtn(false)} style={{ width: "100%", height: 48, borderRadius: 10, border: "none", background: isReady ? (hoveredBtn ? "linear-gradient(135deg, #126B2E, #148C59)" : "linear-gradient(135deg, #186132, #14D571)") : "rgba(0,0,0,0.06)", color: isReady ? "#fff" : "#9CA3AF", fontFamily: "'Unbounded', sans-serif", fontSize: 14, fontWeight: 660, cursor: isReady ? "pointer" : "not-allowed", transition: "all 0.3s", boxShadow: isReady ? (hoveredBtn ? "0 8px 28px rgba(20,140,89,0.3)" : "0 3px 12px rgba(20,140,89,0.15)") : "none", transform: isReady && hoveredBtn ? "translateY(-1px)" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>Run My Audit{isReady && <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-7-7l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}</button>
              <div style={{ textAlign: "center", fontSize: 11, color: "#9CA3AF", marginTop: 10, fontWeight: 400 }}>Free during beta &middot; Full reports from &pound;X/audit after launch</div>
            </div>
          </div>
          <div style={{ ...glass, padding: "22px 18px", display: "flex", flexDirection: "column" }}>{cTitle(<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="#148C59" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>, "Your Audit Pack")}<div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>{[{ label: "What you'll get", title: "UXpact Score + Full Report", desc: "Scored audit across UX, industry & content branding", bg: "linear-gradient(135deg, rgba(20,213,113,0.12), rgba(20,140,89,0.06))", color: "#148C59" },{ label: "Track your fixes", title: "Pulse Extension", desc: "Chrome & Edge extension to check off fixes as you go", bg: "linear-gradient(135deg, rgba(91,97,244,0.12), rgba(91,97,244,0.05))", color: "#5B61F4" },{ label: "Delivery", title: "Instant PDF Download", desc: "Full findings, fixes, and research-backed citations", bg: "linear-gradient(135deg, rgba(20,140,89,0.10), rgba(20,213,113,0.05))", color: "#148C59" }].map((c, i) => (<div key={i} style={{ padding: "18px 16px", borderRadius: 10, background: c.bg, border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.5)", flex: 1, display: "flex", alignItems: "flex-start", gap: 12 }}><div style={{ minWidth: 0 }}><div style={{ fontSize: 10, fontWeight: 600, color: c.color, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{c.label}</div><div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 12, fontWeight: 660, color: "#0B1C48", marginBottom: 4, lineHeight: 1.3 }}>{c.title}</div><div style={{ fontSize: 11.5, color: "#6B7280", lineHeight: 1.45 }}>{c.desc}</div></div></div>))}</div></div>
        </div>
      </div>
      <style>{`* { box-sizing: border-box; margin: 0; } body { margin: 0; } ::placeholder { color: #9CA3AF; font-family: 'Space Grotesk', sans-serif; font-weight: 400; } select { font-family: 'Space Grotesk', sans-serif; } .uxpact-slider { -webkit-appearance: none; appearance: none; background: linear-gradient(90deg, #14D571 0%, #148C59 50%, #5B61F4 100%); border-radius: 3px; } .uxpact-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #fff; border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.18); cursor: pointer; margin-top: -7px; } .uxpact-slider::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: #fff; border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.18); cursor: pointer; } .uxpact-slider::-webkit-slider-runnable-track { height: 6px; border-radius: 3px; background: linear-gradient(90deg, #14D571 0%, #148C59 50%, #5B61F4 100%); } .uxpact-slider::-moz-range-track { height: 6px; border-radius: 3px; background: linear-gradient(90deg, #14D571 0%, #148C59 50%, #5B61F4 100%); }`}</style>
    </div>
  );
}
