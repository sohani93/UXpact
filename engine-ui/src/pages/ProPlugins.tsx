// @ts-nocheck
import Nav from "../components/Nav";
import Blobs from "../components/Blobs";

const C = {
  bg: "#F9F9F9", navy: "#0B1C48", forest: "#186132", emerald: "#148C59",
  mint: "#14D571", violet: "#5B61F4", muted: "#6B7280", dim: "#9CA3AF",
};

const KEYFRAMES = `
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulseAnim{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.85)}}
button:focus{outline:none}
`;

const STEPS = [
  {
    n: "01",
    title: "Run your UXpact audit",
    body: "Audit your site in seconds. UXpact captures structure, copy, trust signals, and technical readiness — 50+ checks across your entire page.",
    icon: "◎",
    color: C.mint,
  },
  {
    n: "02",
    title: "Open the plugin in your tool",
    body: "Install once in Figma, Webflow, or your CMS. The plugin reads your active audit and stays in sync — no copy-paste, no tab switching.",
    icon: "⬡",
    color: C.violet,
  },
  {
    n: "03",
    title: "See findings per section",
    body: "Working on the hero? The plugin surfaces only the findings relevant to that section. Fix, annotate, and mark resolved without leaving your design tool.",
    icon: "✦",
    color: C.mint,
  },
];

const INTEGRATIONS = [
  {
    name: "Figma",
    tag: "Design",
    desc: "Findings attach as comments to the relevant frame. Resolve directly in Figma — status syncs back to your UXpact report.",
    status: "Available",
    statusColor: C.mint,
  },
  {
    name: "Framer",
    tag: "Design",
    desc: "Side panel shows audit findings for the component currently in focus. Inline annotations highlight copy and layout issues.",
    status: "Available",
    statusColor: C.mint,
  },
  {
    name: "Webflow",
    tag: "No-code",
    desc: "Per-page findings surface in the designer sidebar. One-click to read the full fix description without leaving the editor.",
    status: "Beta",
    statusColor: C.violet,
  },
  {
    name: "WordPress",
    tag: "CMS",
    desc: "Plugin in the admin panel shows page-level findings. No design tool required — works alongside any page builder.",
    status: "Coming soon",
    statusColor: C.dim,
  },
  {
    name: "Shopify",
    tag: "E-commerce",
    desc: "Theme editor integration. Findings scoped to product pages, collection pages, and checkout — where drop-off actually happens.",
    status: "Coming soon",
    statusColor: C.dim,
  },
  {
    name: "Wix / Squarespace",
    tag: "Website builder",
    desc: "Lightweight browser extension. Overlays findings directly on your builder canvas so you can see exactly what to fix where.",
    status: "Planned",
    statusColor: C.dim,
  },
];

function MockPluginPanel() {
  return (
    <div style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.8)", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", overflow: "hidden", maxWidth: 320 }}>
      {/* Title bar */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(91,97,244,0.1)", background: "rgba(91,97,244,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.violet, letterSpacing: "0.04em" }}>UXPACT · Hero Section</div>
          <div style={{ fontSize: 9.5, color: C.dim, marginTop: 1 }}>3 findings apply here</div>
        </div>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.mint, animation: "pulseAnim 2s infinite" }} />
      </div>

      {/* Findings */}
      {[
        { sev: "Critical", color: "#EF4444", text: "CTA is below the fold on mobile" },
        { sev: "Critical", color: "#EF4444", text: "H1 is feature-led, not benefit-led" },
        { sev: "Major",    color: "#F59E0B", text: "No social proof near primary CTA" },
      ].map((f, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: i < 2 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: f.color, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: C.navy, lineHeight: 1.3 }}>{f.text}</div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 1 }}>{f.sev}</div>
          </div>
        </div>
      ))}

      {/* Footer */}
      <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: C.dim }}>Synced with UXpact report</span>
        <div style={{ width: 16, height: 16, borderRadius: 4, background: "linear-gradient(135deg,#186132,#14D571)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: "#fff" }}>U</span>
        </div>
      </div>
    </div>
  );
}

export default function ProPlugins({ auditId }: { auditId: string }) {
  const goBack = () => {
    window.history.pushState({}, "", `/report/${auditId}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Space Grotesk',sans-serif", position: "relative" }}>
      <style>{KEYFRAMES}</style>
      <Blobs />
      <Nav />

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 28px 80px" }}>

        <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.muted, fontFamily: "'Space Grotesk',sans-serif", padding: 0, marginBottom: 24 }}>
          ← Back to report
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 40 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 26, fontWeight: 700, color: C.navy, margin: 0, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
                Design Tool{" "}
                <span style={{ background: "linear-gradient(90deg,#5B61F4,#818CF8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Plugins
                </span>
              </h1>
              <div style={{ fontSize: 9, fontWeight: 700, background: "rgba(91,97,244,0.1)", color: C.violet, borderRadius: 20, padding: "4px 12px", letterSpacing: "0.04em", flexShrink: 0 }}>Pro Add-on</div>
            </div>
            <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.7, maxWidth: 500 }}>
              Your UXpact audit findings, surfaced contextually inside Figma, Webflow, and every tool your team already uses. No tab switching. Fix issues exactly where they live.
            </p>
          </div>
          <div style={{ flexShrink: 0, display: "none" }} className="plugin-panel-hero" />
        </div>

        {/* How it works */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.dim, marginBottom: 20 }}>How it works</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.75)", padding: "24px 20px", animation: `fadeUp 0.35s ease ${i * 0.1}s both`, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 16, right: 16, fontFamily: "'Unbounded',sans-serif", fontSize: 28, fontWeight: 700, color: `${s.color}18`, letterSpacing: "-1px" }}>{s.n}</div>
                <div style={{ fontSize: 22, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.navy, marginBottom: 8, lineHeight: 1.3 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.65 }}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live panel preview */}
        <div style={{ background: "linear-gradient(135deg,rgba(91,97,244,0.06),rgba(20,213,113,0.04))", borderRadius: 16, border: "1px solid rgba(91,97,244,0.1)", padding: "32px 28px", marginBottom: 48, display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.violet, marginBottom: 12 }}>Plugin panel — live preview</div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: C.navy, marginBottom: 10, lineHeight: 1.4 }}>Findings follow your cursor, not your tab bar</div>
            <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.65, margin: 0 }}>
              As you move between sections in Figma or Webflow, the panel updates automatically — showing only the findings relevant to what you're designing right now. Hero? See hero findings. Pricing? See pricing findings.
            </p>
          </div>
          <MockPluginPanel />
        </div>

        {/* Integrations */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.dim, marginBottom: 20 }}>Integrations</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
            {INTEGRATIONS.map((t, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.75)", padding: "18px 20px", display: "flex", gap: 14, alignItems: "flex-start", animation: `fadeUp 0.35s ease ${i * 0.06}s both` }}>
                <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 9, background: "rgba(11,28,72,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{t.name[0]}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{t.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: C.dim, background: "rgba(11,28,72,0.06)", borderRadius: 4, padding: "2px 7px" }}>{t.tag}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: t.statusColor, background: `${t.statusColor}18`, borderRadius: 4, padding: "2px 7px", marginLeft: "auto" }}>{t.status}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6 }}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 40, padding: "28px 28px", background: "linear-gradient(135deg,#186132 0%,#148C59 60%,#14D571 100%)", borderRadius: 14, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6, fontFamily: "'Unbounded',sans-serif", letterSpacing: "-0.3px" }}>Get early access to Plugins</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 20 }}>Available to Pro users first. Join the waitlist and we'll notify you when your tool is ready.</div>
          <div style={{ display: "inline-flex", gap: 3, background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: 4 }}>
            {["Figma", "Framer", "Webflow", "WordPress", "Shopify"].map(t => (
              <div key={t} style={{ padding: "6px 14px", borderRadius: 6, background: "rgba(255,255,255,0.12)", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{t}</div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
