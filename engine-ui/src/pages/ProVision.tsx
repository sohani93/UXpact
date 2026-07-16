// @ts-nocheck
import { useState } from "react";
import Nav from "../components/Nav";
import Blobs from "../components/Blobs";

const C = {
  bg: "#EEF1F5", navy: "#0B1C48", forest: "#186132", emerald: "#148C59",
  mint: "#14D571", violet: "#5B61F4", muted: "#6B7280", dim: "#9CA3AF",
  border: "rgba(0,0,0,0.07)",
};

const KEYFRAMES = `
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
`;

const ANNOTATIONS = [
  { id: 1, label: "H1 rewritten — benefit-led", color: "#14D571" },
  { id: 2, label: "CTA moved above fold, micro-copy added", color: "#5B61F4" },
  { id: 3, label: "Trust strip inserted below CTA", color: "#14D571" },
  { id: 4, label: "Feature cards rewritten — outcome language", color: "#5B61F4" },
  { id: 5, label: "Logo strip + testimonial quote added", color: "#14D571" },
  { id: 6, label: "Pricing anchor copy added above grid", color: "#5B61F4" },
];

const CHANGE_CHIPS = [
  ["CTA above fold", "#14D571"], ["Benefit-led H1", "#5B61F4"],
  ["Secondary CTA added", "#14D571"], ["Trust strip", "#5B61F4"],
  ["Outcome-led features", "#14D571"], ["Testimonial near CTA", "#5B61F4"],
  ["Pricing anchor copy", "#14D571"],
];

function AnnotationPin({ id, activeId, setActiveId, children }) {
  const ann = ANNOTATIONS.find(a => a.id === id);
  const active = activeId === id;
  return (
    <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setActiveId(active ? null : id)}>
      {children}
      <div style={{ position: "absolute", top: 4, right: -10, width: 20, height: 20, borderRadius: "50%", background: ann.color, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, boxShadow: "0 2px 6px rgba(0,0,0,0.2)", transition: "transform 0.15s", transform: active ? "scale(1.2)" : "scale(1)" }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: "#fff" }}>{id}</span>
      </div>
      {active && (
        <div style={{ position: "absolute", top: 28, right: -10, background: C.navy, color: "#fff", fontSize: 11, padding: "6px 10px", borderRadius: 7, whiteSpace: "nowrap", zIndex: 20, pointerEvents: "none", boxShadow: "0 4px 14px rgba(0,0,0,0.25)", fontFamily: "'Space Grotesk',sans-serif" }}>
          {ann.label}
          <div style={{ position: "absolute", top: -5, right: 5, width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: `5px solid ${C.navy}` }} />
        </div>
      )}
    </div>
  );
}

function CurrentPage() {
  return (
    <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: C.navy }}>YourSite</div>
        <div style={{ display: "flex", gap: 12, fontSize: 10.5, color: C.dim, alignItems: "center" }}>
          {["Home", "Features", "Pricing", "Blog"].map(t => <span key={t}>{t}</span>)}
          <span style={{ padding: "3px 10px", border: `1px solid ${C.navy}`, borderRadius: 4, fontSize: 10, fontWeight: 600, color: C.navy }}>Get Started</span>
        </div>
      </div>
      <div style={{ padding: "20px 16px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 6, lineHeight: 1.3, fontFamily: "'Unbounded',sans-serif" }}>Powerful analytics for modern teams</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>Track, measure, and optimise your product with real-time data.</div>
        <div style={{ height: 30, marginTop: 8, width: "45%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(24,97,50,0.2)", borderRadius: 5, fontSize: 11, fontWeight: 600, color: "#186132" }}>Start Free Trial</div>
        <div style={{ marginTop: 6, fontSize: 10, color: "#DC2626" }}>⚠ CTA is 680px from top — below fold on mobile</div>
      </div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: C.dim, marginBottom: 6 }}>FEATURES</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Everything you need</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {["Real-time dashboards", "Custom reports", "Team collaboration"].map((t, i) => (
            <div key={i} style={{ padding: 8, background: "#F9FAFB", borderRadius: 5, border: "1px solid #E5E7EB" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.navy, marginBottom: 2 }}>{t}</div>
              <div style={{ fontSize: 9.5, color: C.dim }}>We built this to give you instant visibility.</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "12px 16px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Trusted by teams at leading companies</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>{[50, 40, 60, 45, 38].map((w, i) => <div key={i} style={{ height: 14, width: w, background: "rgba(11,28,72,0.08)", borderRadius: 3 }} />)}</div>
        <div style={{ background: "#FFF4E6", border: "1px solid #FFD580", borderRadius: 4, padding: "6px 10px", fontSize: 10, color: "#92400E" }}>No testimonial quotes detected</div>
      </div>
    </div>
  );
}

function VisionPage({ activeId, setActiveId }) {
  return (
    <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(20,213,113,0.2)", boxShadow: "0 0 0 2px rgba(20,213,113,0.08)" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: C.navy }}>YourSite</div>
        <div style={{ display: "flex", gap: 12, fontSize: 10.5, color: C.dim, alignItems: "center" }}>
          {["Home", "Features", "Pricing", "Blog"].map(t => <span key={t}>{t}</span>)}
          <span style={{ padding: "4px 12px", background: "linear-gradient(135deg,#186132,#14D571)", borderRadius: 5, fontSize: 10, fontWeight: 700, color: "#fff" }}>Start Free Trial</span>
        </div>
      </div>
      <div style={{ padding: "20px 16px", borderBottom: "1px solid #F3F4F6", background: "linear-gradient(160deg,rgba(20,213,113,0.04),rgba(255,255,255,0))" }}>
        <AnnotationPin id={1} activeId={activeId} setActiveId={setActiveId}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 4, lineHeight: 1.3, fontFamily: "'Unbounded',sans-serif" }}>Ship features 40% faster — the tool lean SaaS teams trust</div>
        </AnnotationPin>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>See what your team shipped, where it slowed down, and what to fix next — without leaving your desk.</div>
        <AnnotationPin id={2} activeId={activeId} setActiveId={setActiveId}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
            <div style={{ height: 30, padding: "0 16px", display: "flex", alignItems: "center", background: "linear-gradient(135deg,#186132,#14D571)", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#fff", boxShadow: "0 2px 8px rgba(20,140,89,0.3)" }}>Start Free Trial →</div>
            <div style={{ height: 30, padding: "0 14px", display: "flex", alignItems: "center", border: "1.5px solid #148C59", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "#148C59" }}>See 2-min demo</div>
          </div>
        </AnnotationPin>
        <AnnotationPin id={3} activeId={activeId} setActiveId={setActiveId}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4 }}>{[32, 26, 28, 30, 24].map((w, i) => <div key={i} style={{ height: 14, width: w, background: "rgba(11,28,72,0.12)", borderRadius: 2 }} />)}</div>
            <div style={{ fontSize: 9.5, color: C.dim }}>Trusted by 600+ teams</div>
          </div>
        </AnnotationPin>
      </div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: C.dim, marginBottom: 6 }}>FEATURES</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Your team, always moving forward</div>
        <AnnotationPin id={4} activeId={activeId} setActiveId={setActiveId}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[["You always know what shipped", "Real-time dashboards"], ["Your team runs any report in 30s", "Custom reports"], ["No more status meetings", "Team collaboration"]].map(([out, t], i) => (
              <div key={i} style={{ padding: 8, background: "rgba(20,213,113,0.04)", borderRadius: 5, border: "1px solid rgba(20,213,113,0.15)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.navy, marginBottom: 2 }}>{out}</div>
                <div style={{ fontSize: 9.5, color: C.dim }}>{t}</div>
              </div>
            ))}
          </div>
        </AnnotationPin>
      </div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Trusted by teams at leading companies</div>
        <AnnotationPin id={5} activeId={activeId} setActiveId={setActiveId}>
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>{[50, 40, 60, 45, 38].map((w, i) => <div key={i} style={{ height: 14, width: w, background: "rgba(11,28,72,0.12)", borderRadius: 3 }} />)}</div>
            <div style={{ padding: "8px 10px", borderRadius: 5, background: "rgba(20,213,113,0.05)", border: "1px solid rgba(20,213,113,0.12)", fontSize: 10.5, color: C.navy, lineHeight: 1.5, fontStyle: "italic" }}>
              "We cut our planning cycle by 3 weeks in the first month."
              <div style={{ fontSize: 9.5, color: C.dim, marginTop: 3, fontStyle: "normal" }}>— Sarah Chen, Head of Product, Notion</div>
            </div>
          </div>
        </AnnotationPin>
      </div>
      <div style={{ padding: "12px 16px" }}>
        <AnnotationPin id={6} activeId={activeId} setActiveId={setActiveId}>
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, lineHeight: 1.4 }}>Teams using our platform ship 2× faster in their first 90 days.</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Simple, transparent pricing</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5 }}>
              {[["Starter", "$0", "free forever", false], ["Growth", "$49", "/ mo", false], ["Pro", "$99", "/ mo", true], ["Ent.", "Custom", "", false]].map(([n, p, s, pop]) => (
                <div key={n} style={{ padding: 8, background: pop ? "rgba(20,213,113,0.06)" : "#F9FAFB", border: `1px solid ${pop ? "rgba(20,213,113,0.3)" : "#E5E7EB"}`, borderRadius: 5, textAlign: "center", position: "relative" }}>
                  {pop && <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", background: "#148C59", color: "#fff", fontSize: 7, fontWeight: 700, padding: "2px 6px", borderRadius: 8 }}>POPULAR</div>}
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: C.navy }}>{n}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.navy, margin: "2px 0" }}>{p}</div>
                  <div style={{ fontSize: 9, color: C.dim }}>{s}</div>
                </div>
              ))}
            </div>
          </div>
        </AnnotationPin>
      </div>
    </div>
  );
}

export default function ProVision({ auditId }: { auditId: string }) {
  const [view, setView] = useState<"current" | "vision" | "split">("vision");
  const [activeId, setActiveId] = useState<number | null>(null);

  const goBack = () => {
    window.history.pushState({}, "", `/report/${auditId}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Space Grotesk',sans-serif", position: "relative" }}>
      <style>{KEYFRAMES}</style>
      <Blobs />
      <Nav />

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 28px 60px" }}>

        <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.muted, fontFamily: "'Space Grotesk',sans-serif", padding: 0, marginBottom: 20 }}>
          ← Back to report
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 24, fontWeight: 700, color: C.navy, margin: 0, letterSpacing: "-0.5px" }}>
            UXpact <span style={{ background: "linear-gradient(90deg,#186132,#14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Vision</span>
          </h1>
          <div style={{ fontSize: 9, fontWeight: 700, background: "rgba(91,97,244,0.1)", color: C.violet, borderRadius: 20, padding: "4px 12px", letterSpacing: "0.04em", flexShrink: 0 }}>Pro</div>
        </div>
        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px", lineHeight: 1.6 }}>
          A fully redesigned version of your site with every audit finding applied — improved structure, rewritten copy, industry benchmark standards baked in. Click any numbered pin for the annotation.
        </p>

        {/* Change chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
          {CHANGE_CHIPS.map(([t, c]) => (
            <div key={t} style={{ fontSize: 11, fontWeight: 600, color: c, background: `${c}18`, border: `1px solid ${c}30`, borderRadius: 5, padding: "4px 10px" }}>{t}</div>
          ))}
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ display: "inline-flex", borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden" }}>
            {(["current", "split", "vision"] as const).map((v, i) => {
              const labels = ["Current", "Split", "Vision ✦"];
              return (
                <button key={v} onClick={() => setView(v)}
                  style={{ padding: "8px 18px", fontSize: 12, fontWeight: view === v ? 700 : 400, color: view === v ? C.emerald : C.dim, background: view === v ? "rgba(20,213,113,0.1)" : "rgba(255,255,255,0.7)", border: "none", cursor: "pointer", transition: "all 0.2s", fontFamily: "'Space Grotesk',sans-serif" }}>
                  {labels[i]}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 11, color: C.dim }}>Click numbered pins on Vision view to see what changed</span>
        </div>

        {/* Page views */}
        <div style={{ animation: "fadeUp 0.35s ease both" }}>
          {view === "current" && <CurrentPage />}
          {view === "vision" && <VisionPage activeId={activeId} setActiveId={setActiveId} />}
          {view === "split" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.dim, marginBottom: 8 }}>Current</div>
                <CurrentPage />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.mint, marginBottom: 8 }}>Vision ✦</div>
                <VisionPage activeId={activeId} setActiveId={setActiveId} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
