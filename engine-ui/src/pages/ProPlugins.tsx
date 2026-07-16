// @ts-nocheck
import { useState } from "react";
import Nav from "../components/Nav";
import Blobs from "../components/Blobs";

const C = {
  bg: "#EEF1F5", navy: "#0B1C48", forest: "#186132", emerald: "#148C59",
  mint: "#14D571", violet: "#5B61F4", muted: "#6B7280", dim: "#9CA3AF",
};

const KEYFRAMES = `
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulseAnim{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.85)}}
`;

const TOOLS = ["Figma", "Framer", "Webflow", "WordPress", "Wix", "Squarespace", "Shopify"];

const PLUGIN_FINDINGS: Record<string, { t: string; s: string }[]> = {
  Figma:       [{ t: "CTA below fold", s: "Critical" }, { t: "Value prop unclear", s: "Critical" }, { t: "No social proof near CTA", s: "Major" }],
  Framer:      [{ t: "CTA below fold", s: "Critical" }, { t: "Brand voice inconsistent", s: "Major" }],
  Webflow:     [{ t: "Mobile nav hides pricing", s: "Major" }, { t: "Feature copy feature-led", s: "Minor" }],
  WordPress:   [{ t: "CTA below fold", s: "Critical" }, { t: "Page speed below threshold", s: "Major" }, { t: "No schema markup", s: "Minor" }],
  Wix:         [{ t: "Value prop unclear", s: "Critical" }, { t: "Mobile layout breaks on scroll", s: "Major" }],
  Squarespace: [{ t: "No testimonials near CTA", s: "Major" }, { t: "Nav CTA not visually prominent", s: "Minor" }],
  Shopify:     [{ t: "Above-fold CTA competes with nav", s: "Major" }, { t: "Product copy feature-led", s: "Major" }, { t: "Trust badges missing near checkout", s: "Minor" }],
};

const SEV_DOT: Record<string, string> = { Critical: "#EF4444", Major: "#F59E0B", Minor: "#EAB308" };

export default function ProPlugins({ auditId }: { auditId: string }) {
  const [active, setActive] = useState("Figma");

  const goBack = () => {
    window.history.pushState({}, "", `/report/${auditId}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const findings = PLUGIN_FINDINGS[active] ?? [];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Space Grotesk',sans-serif", position: "relative" }}>
      <style>{KEYFRAMES}</style>
      <Blobs />
      <Nav />

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 28px 60px" }}>

        <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.muted, fontFamily: "'Space Grotesk',sans-serif", padding: 0, marginBottom: 20 }}>
          ← Back to report
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 24, fontWeight: 700, color: C.navy, margin: 0, letterSpacing: "-0.5px" }}>
            Design Tool <span style={{ background: "linear-gradient(90deg,#5B61F4,#818CF8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Plugins</span>
          </h1>
          <div style={{ fontSize: 9, fontWeight: 700, background: "rgba(91,97,244,0.1)", color: C.violet, borderRadius: 20, padding: "4px 12px", letterSpacing: "0.04em", flexShrink: 0 }}>Pro Add-on</div>
        </div>
        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 28px", lineHeight: 1.6 }}>
          Audit findings surfaced contextually in your design tool. Working on the hero? The plugin shows exactly which findings apply — without leaving your tool.
        </p>

        {/* Tool selector */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          {TOOLS.map(t => (
            <button key={t} onClick={() => setActive(t)}
              style={{ fontSize: 11, fontWeight: 600, borderRadius: 7, padding: "6px 14px", border: "none", cursor: "pointer", transition: "all 0.2s", background: active === t ? "linear-gradient(135deg,rgba(91,97,244,0.15),rgba(20,213,113,0.1))" : "rgba(255,255,255,0.7)", color: active === t ? C.violet : C.muted, transform: active === t ? "scale(1.05)" : "scale(1)", boxShadow: active === t ? "0 2px 8px rgba(91,97,244,0.15)" : "none", fontFamily: "'Space Grotesk',sans-serif" }}>
              {t}
            </button>
          ))}
        </div>

        {/* Plugin panel */}
        <div style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.75)", boxShadow: "0 4px 20px rgba(0,0,0,0.04)", overflow: "hidden", animation: "fadeUp 0.3s ease both" }}>

          {/* Panel header */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(91,97,244,0.08)", background: "rgba(91,97,244,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.violet, marginBottom: 3 }}>Plugin Panel — {active} · Hero Section Active</div>
              <div style={{ fontSize: 11, color: C.dim }}>Findings that apply to the section you're currently working on</div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.mint, animation: "pulseAnim 2s infinite" }} />
          </div>

          {/* Findings */}
          <div style={{ padding: "6px 0" }}>
            {findings.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < findings.length - 1 ? "1px solid rgba(91,97,244,0.06)" : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: SEV_DOT[r.s] ?? C.dim, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{r.t}</div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{r.s}</div>
                </div>
                <button style={{ fontSize: 10, fontWeight: 700, color: C.violet, background: "rgba(91,97,244,0.08)", border: "none", borderRadius: 5, padding: "4px 10px", cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif" }}>
                  Fix →
                </button>
              </div>
            ))}
          </div>

          <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: C.dim }}>{findings.length} of 8 findings apply to this section</span>
            <span style={{ fontSize: 11, color: C.muted }}>Active: Hero section</span>
          </div>
        </div>

        {/* Tool info cards */}
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {[
            { icon: "🎨", t: "Figma & Framer", d: "Comments attach to frames. Findings update as you design." },
            { icon: "🌐", t: "Webflow & CMS", d: "Findings surface per-page in the designer. One-click fix descriptions." },
            { icon: "🛍️", t: "Shopify & WordPress", d: "Plugin available in the admin panel. No design tool required." },
          ].map((c, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(16px)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.7)", padding: "16px 14px", animation: `fadeUp 0.3s ease ${i * 0.1}s both` }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 5 }}>{c.t}</div>
              <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>{c.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
