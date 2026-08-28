import { useState } from "react";
import { color, font, glass, gradient, radius } from "../theme";
import type { IntakeFormData } from "../lib/types";
import Reveal from "../shared/Reveal";

const INDUSTRIES: { value: string; label: string }[] = [
  { value: "saas", label: "SaaS / Software" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "portfolio", label: "Portfolio / Agency" },
  { value: "healthcare", label: "Healthcare" },
  { value: "fintech", label: "Fintech" },
  { value: "service", label: "Service business" },
];

const GOAL_CHIPS = ["Signups", "Bookings", "Sales", "Demo requests", "Lead gen", "Brand awareness"];

export default function IntakeForm({ onSubmit, initial }: { onSubmit: (form: IntakeFormData) => void; initial: IntakeFormData }) {
  const [url, setUrl] = useState(initial.url);
  const [industry, setIndustry] = useState(initial.industry || "saas");
  const [goal, setGoal] = useState(initial.goal);
  const [touched, setTouched] = useState(false);

  const isValid = url.trim().length > 3;

  const submit = () => {
    setTouched(true);
    if (!isValid) return;
    onSubmit({ name: "", email: "", url: url.trim(), industry, goal, challenge: "", focusAreas: goal ? [goal] : [] });
  };

  return (
    <div style={{ minHeight: "100vh", background: color.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -120, left: -100, width: 520, height: 520, background: "radial-gradient(circle, rgba(20,213,113,0.12) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -160, right: -120, width: 480, height: 480, background: "radial-gradient(circle, rgba(91,97,244,0.08) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

      <Reveal>
        <div style={{ maxWidth: 560, width: "100%", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, justifyContent: "center" }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: gradient.brand, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 12px rgba(20,140,89,0.3)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" /></svg>
            </div>
            <span style={{ fontFamily: font.display, fontSize: 18, fontWeight: 700, color: color.navy }}>UXpact</span>
          </div>

          <h1 style={{ fontFamily: font.display, fontSize: 34, fontWeight: 700, color: color.navy, textAlign: "center", letterSpacing: "-0.6px", margin: "0 0 10px", lineHeight: 1.15 }}>
            What's your site{" "}
            <span style={{ background: gradient.text, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>actually doing</span>
            {" "}to visitors?
          </h1>
          <p style={{ fontFamily: font.body, fontSize: 15, color: color.muted, textAlign: "center", margin: "0 0 32px" }}>
            Drop a URL. We'll read it the way a real visitor does and tell you the story.
          </p>

          <div style={{ ...glass, borderRadius: radius.xl, padding: 28 }}>
            <label style={{ fontFamily: font.body, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: color.dim, display: "block", marginBottom: 8 }}>
              Site URL
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="yoursite.com"
              style={{
                width: "100%", boxSizing: "border-box", padding: "14px 16px", borderRadius: radius.md,
                border: `1.5px solid ${touched && !isValid ? "rgba(179,38,30,0.4)" : "rgba(11,28,72,0.1)"}`,
                background: "rgba(255,255,255,0.85)", fontFamily: font.body, fontSize: 15, color: color.navy,
                marginBottom: 18, outline: "none",
              }}
            />

            <label style={{ fontFamily: font.body, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: color.dim, display: "block", marginBottom: 8 }}>
              What kind of site is it?
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
              {INDUSTRIES.map((opt) => (
                <button key={opt.value} onClick={() => setIndustry(opt.value)} style={{
                  padding: "7px 13px", borderRadius: radius.pill, border: "none", cursor: "pointer",
                  fontFamily: font.body, fontSize: 12.5, fontWeight: 600, transition: "all 0.15s",
                  background: industry === opt.value ? gradient.brand : "rgba(11,28,72,0.05)",
                  color: industry === opt.value ? "#fff" : color.muted,
                }}>{opt.label}</button>
              ))}
            </div>

            <label style={{ fontFamily: font.body, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: color.dim, display: "block", marginBottom: 8 }}>
              Main goal for the page
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 26 }}>
              {GOAL_CHIPS.map((g) => (
                <button key={g} onClick={() => setGoal(g)} style={{
                  padding: "7px 13px", borderRadius: radius.pill, cursor: "pointer",
                  fontFamily: font.body, fontSize: 12.5, fontWeight: 600, transition: "all 0.15s",
                  background: goal === g ? "rgba(91,97,244,0.12)" : "rgba(11,28,72,0.05)",
                  color: goal === g ? color.violet : color.muted,
                  border: goal === g ? `1px solid rgba(91,97,244,0.3)` : "1px solid transparent",
                }}>{g}</button>
              ))}
            </div>

            <button
              onClick={submit}
              style={{
                width: "100%", padding: "15px 0", borderRadius: radius.md, border: "none", cursor: "pointer",
                background: gradient.brand, color: "#fff", fontFamily: font.display, fontSize: 14, fontWeight: 700,
                boxShadow: "0 6px 20px rgba(20,140,89,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
            >
              Diagnose my site
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-7-7l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            {touched && !isValid && <p style={{ color: color.danger, fontSize: 12, textAlign: "center", marginTop: 10, fontFamily: font.body }}>Enter a real site URL to continue.</p>}
          </div>
          <p style={{ textAlign: "center", fontSize: 11.5, color: color.dim, marginTop: 16, fontFamily: font.body }}>Free during beta.</p>
        </div>
      </Reveal>
    </div>
  );
}
