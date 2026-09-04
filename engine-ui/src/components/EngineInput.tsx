// ─── INTAKE ──────────────────────────────────────────────────────────────
// Standalone page at "/", built to the approved mockup's actual .intake-bar
// markup byte-for-byte (url field, two single-select chip groups, one CTA) —
// not the old invented multi-card "Configure Your Audit" form, which never
// existed in the mockup. run-audit only ever reads url/industry/goal from
// the payload (name/email/challenge/focusAreas were dead fields, unread by
// the backend), so this intake collects exactly what the mockup collects.
import { useState } from "react";
import Nav from "./Nav";
import Blobs from "./Blobs";
import type { AuditRequestFormData } from "../lib/ui-types";

const SITE_TYPES = [
  { value: "saas", label: "SaaS" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "portfolio", label: "Portfolio / Agency" },
  { value: "healthcare", label: "Healthcare" },
  { value: "fintech", label: "Fintech" },
  { value: "service", label: "Service business" },
];
const GOALS = ["Signups", "Bookings", "Sales", "Demo requests", "Lead gen", "Brand awareness"];

const T = {
  canvas: "#060509", surface: "rgba(255,255,255,0.045)",
  ink: "#F3F1FA", inkSoft: "#B7B2CC", inkDim: "#79749A", line: "rgba(255,255,255,0.09)",
  forest: "#1F8C4C", mint: "#14D571", violet: "#7B7FFF", violetSoft: "rgba(123,127,255,0.14)",
} as const;

const KEYFRAMES = `
@keyframes gaSpin { to { --ga: 360deg; } }
@property --ga { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
`;

type EngineInputProps = {
  onSubmit: (formData: AuditRequestFormData) => void;
  initialForm?: AuditRequestFormData;
};

export default function EngineInput({ onSubmit, initialForm }: EngineInputProps) {
  const [url, setUrl] = useState(initialForm?.url ?? "");
  const [email, setEmail] = useState(initialForm?.email ?? "");
  const [industry, setIndustry] = useState(initialForm?.industry || "saas");
  const [goal, setGoal] = useState(initialForm?.goal || "Signups");

  const isReady = url.trim().length > 0 && email.trim().length > 0;

  const handleSubmit = () => {
    if (!isReady) return;
    onSubmit({ name: "", email, url, industry, goal, challenge: "", focusAreas: [] });
  };

  return (
    <div style={{ minHeight: "100vh", background: T.canvas, fontFamily: "'Space Grotesk', sans-serif", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <style>{KEYFRAMES}</style>
      <Blobs />
      <Nav />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 24px", position: "relative", zIndex: 10 }}>
        <div style={{ width: "100%", maxWidth: 620 }}>
          <div style={{ position: "relative", borderRadius: 16, padding: 1.5 }}>
            <div style={{
              content: "", position: "absolute", inset: 0, borderRadius: 16, padding: 1.5,
              background: `conic-gradient(from var(--ga,0deg), transparent 0deg, transparent 250deg, rgba(20,213,113,0) 270deg, ${T.forest} 305deg, ${T.mint} 335deg, ${T.violet} 355deg, transparent 360deg)`,
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              animation: "gaSpin 3.4s linear infinite",
            } as React.CSSProperties} />
            <div style={{ position: "relative", background: "#0C0A14", borderRadius: 15, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 14px", background: T.surface, borderRadius: 10, marginBottom: 16 }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: T.inkDim }}>https://</span>
                <input
                  autoFocus
                  type="text"
                  placeholder="yoursite.com"
                  value={url.replace(/^https?:\/\//i, "")}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                  style={{ flex: 1, border: "none", background: "transparent", fontFamily: "'Space Mono', monospace", fontSize: 13.5, color: T.ink, outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 14px", background: T.surface, borderRadius: 10, marginBottom: 16 }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: T.inkDim }}>@</span>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                  style={{ flex: 1, border: "none", background: "transparent", fontFamily: "'Space Mono', monospace", fontSize: 13.5, color: T.ink, outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: 26, flexWrap: "wrap", marginBottom: 18 }}>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9.5, letterSpacing: "0.07em", textTransform: "uppercase", color: T.inkDim, marginBottom: 8 }}>Site type</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {SITE_TYPES.map((t) => {
                      const on = industry === t.value;
                      return (
                        <button key={t.value} type="button" onClick={() => setIndustry(t.value)} style={{
                          fontFamily: "'Space Grotesk', sans-serif", fontSize: 11.5, fontWeight: 600, padding: "6px 12px", borderRadius: 999,
                          background: on ? T.violetSoft : T.surface, color: on ? T.violet : T.inkSoft, cursor: "pointer", border: "none", whiteSpace: "nowrap",
                        }}>{t.label}</button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9.5, letterSpacing: "0.07em", textTransform: "uppercase", color: T.inkDim, marginBottom: 8 }}>Goal</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {GOALS.map((g) => {
                      const on = goal === g;
                      return (
                        <button key={g} type="button" onClick={() => setGoal(g)} style={{
                          fontFamily: "'Space Grotesk', sans-serif", fontSize: 11.5, fontWeight: 600, padding: "6px 12px", borderRadius: 999,
                          background: on ? T.mint : T.surface, color: on ? "#06210F" : T.inkSoft, cursor: "pointer", border: "none", whiteSpace: "nowrap",
                        }}>{g}</button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!isReady}
                onClick={handleSubmit}
                style={{
                  width: "100%", fontFamily: "'Unbounded', sans-serif", fontWeight: 680, fontSize: 13, color: "#fff",
                  background: isReady ? `linear-gradient(100deg, ${T.forest}, ${T.mint})` : "rgba(255,255,255,0.08)",
                  border: "none", borderRadius: 10, padding: "13px 0", cursor: isReady ? "pointer" : "not-allowed",
                }}
              >
                Reveal the story →
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`* { box-sizing: border-box; } ::placeholder { color: #79749A; font-family: 'Space Mono', monospace; }`}</style>
    </div>
  );
}
