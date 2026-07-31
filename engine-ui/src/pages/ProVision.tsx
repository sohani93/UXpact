// @ts-nocheck
import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";
import Nav from "../components/Nav";
import Blobs from "../components/Blobs";

const C = {
  bg: "#EEF1F5", navy: "#0B1C48", forest: "#186132", emerald: "#148C59",
  mint: "#14D571", violet: "#5B61F4", muted: "#6B7280", dim: "#9CA3AF",
  border: "rgba(0,0,0,0.07)",
};

const KEYFRAMES = `
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes pinPop{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}}
button:focus{outline:none}
`;

/* ── Pin component ──────────────────────────────────────────────── */
function Pin({ id, label, color, activeId, setActiveId, x, y }: any) {
  const active = activeId === id;
  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: 10 }}>
      <div
        onClick={() => setActiveId(active ? null : id)}
        style={{
          width: 20, height: 20, borderRadius: "50%",
          background: color, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 2px 8px ${color}60`,
          transition: "transform 0.15s",
          transform: active ? "scale(1.25)" : "scale(1)",
          animation: `pinPop 0.3s ease ${id * 0.08}s both`,
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 800, color: "#fff" }}>{id}</span>
      </div>
      {active && (
        <div style={{
          position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)",
          background: C.navy, color: "#fff", fontSize: 11, fontWeight: 500,
          padding: "7px 11px", borderRadius: 8, whiteSpace: "nowrap",
          zIndex: 20, pointerEvents: "none",
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1.4,
          maxWidth: 220, textAlign: "center",
        }}>
          {label}
          <div style={{
            position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderBottom: `5px solid ${C.navy}`,
          }} />
        </div>
      )}
    </div>
  );
}

/* ── Build the vision mockup from real dom_data + LLM story output ── */
function buildVision(domain: string, findings: any[], domData: any, visionRewrite: { h1?: string; hero_copy?: string; cta?: string } | null, storyFixes: string[] | null) {
  const failing = findings.filter(f => !f.pass && !f.manual_review);
  const has = (id: string) => failing.some(f => f.check_id === id);

  const h1Fail     = has("A1.1");
  const ctaFail    = has("A1.4");
  const trustFail  = has("A4.1") || has("A4.3");
  const socialFail = has("A4.3") || has("A4.5");
  const copyFail   = has("C4.1");
  const priceFail  = has("A3.3") || has("B2.1");

  const domainLabel = domain.replace(/^https?:\/\//, "").replace(/\/.*/, "");
  const currentH1 = domData?.h1Text || "Your site headline (audited as-is)";
  const currentCta = domData?.ctaTexts?.[0] || "Get started";

  // Prefer the LLM's story rewrite; fall back to rule-based synthesis when it's unavailable.
  const headline = visionRewrite?.h1
    || (h1Fail ? `The faster way to get results — ${domainLabel.split(".")[0]}` : currentH1);

  const subheadline = visionRewrite?.hero_copy
    || (copyFail
      ? "Join thousands of teams who've cut their time-to-result in half. No setup fee. Cancel any time."
      : "A clear, outcome-focused subheadline that speaks to what visitors actually gain.");

  const ctaLabel = visionRewrite?.cta || (ctaFail ? "Start for free →" : currentCta);
  const ctaMicro = ctaFail ? "No credit card required · Set up in 2 minutes" : "";

  const annotations: { id: number; label: string; color: string }[] = [];
  let pinId = 1;
  const fixQueue = storyFixes ? [...storyFixes] : [];
  const nextLabel = (fallback: string) => fixQueue.length > 0 ? fixQueue.shift()! : fallback;

  if (h1Fail || visionRewrite?.h1) annotations.push({ id: pinId++, label: nextLabel("H1 rewritten to be benefit-led — focuses on outcome, not features"), color: C.mint });
  if (ctaFail) annotations.push({ id: pinId++, label: nextLabel("CTA moved above fold with micro-copy to reduce hesitation"), color: C.violet });
  if (trustFail) annotations.push({ id: pinId++, label: nextLabel("Trust strip inserted below CTA — social proof at the moment of decision"), color: C.mint });
  if (copyFail) annotations.push({ id: pinId++, label: nextLabel("Feature cards rewritten with outcome language (you, not we)"), color: C.violet });
  if (socialFail) annotations.push({ id: pinId++, label: nextLabel("Testimonial quote added near CTA — trust proximity"), color: C.mint });
  if (priceFail) annotations.push({ id: pinId++, label: nextLabel("Pricing anchor copy added to prime value before grid"), color: C.violet });
  if (annotations.length === 0) {
    annotations.push({ id: 1, label: "Structure is solid — Vision focuses on copy and trust refinements", color: C.mint });
  }

  const changes = [
    (h1Fail || visionRewrite?.h1) && ["Benefit-led H1",        C.mint],
    ctaFail    && ["CTA above fold",         C.violet],
    ctaFail    && ["Micro-copy added",        C.mint],
    trustFail  && ["Trust strip",             C.violet],
    copyFail   && ["Outcome-led copy",        C.mint],
    socialFail && ["Testimonial near CTA",    C.violet],
    priceFail  && ["Pricing anchor copy",     C.mint],
  ].filter(Boolean) as [string, string][];

  return { headline, subheadline, ctaLabel, ctaMicro, annotations, changes, domainLabel, h1Fail, ctaFail, trustFail, socialFail, copyFail, currentH1, currentCta, navLinks: domData?.navLinks ?? [] };
}

/* ── Mockup render ──────────────────────────────────────────────── */
function VisionMockup({ vision, activeId, setActiveId }: any) {
  const { headline, subheadline, ctaLabel, ctaMicro, annotations, domainLabel, h1Fail, ctaFail, trustFail, socialFail, copyFail } = vision;

  const pinFor = (id: number) => annotations.find(a => a.id === id);

  return (
    <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", border: "1.5px solid rgba(20,213,113,0.25)", boxShadow: "0 0 0 3px rgba(20,213,113,0.06), 0 8px 24px rgba(0,0,0,0.06)", position: "relative" }}>

      {/* Nav */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 12, color: C.navy, fontFamily: "'Unbounded',sans-serif" }}>{domainLabel.split(".")[0].charAt(0).toUpperCase() + domainLabel.split(".")[0].slice(1)}</div>
        <div style={{ display: "flex", gap: 12, fontSize: 10.5, color: C.dim, alignItems: "center" }}>
          {["Home", "Features", "Pricing", "Blog"].map(t => <span key={t}>{t}</span>)}
          <div style={{ padding: "4px 12px", background: "linear-gradient(135deg,#186132,#14D571)", borderRadius: 5, fontSize: 10, fontWeight: 700, color: "#fff" }}>
            {ctaFail ? "Start free →" : "Get started"}
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: "22px 18px 18px", borderBottom: "1px solid #F3F4F6", background: "linear-gradient(160deg,rgba(20,213,113,0.03),rgba(255,255,255,0))", position: "relative" }}>
        {h1Fail && pinFor(1) && (
          <Pin id={1} label={pinFor(1)!.label} color={pinFor(1)!.color} activeId={activeId} setActiveId={setActiveId} x="calc(100% - 28px)" y={0} />
        )}
        <div style={{ fontSize: 15, fontWeight: 800, color: C.navy, marginBottom: 6, lineHeight: 1.3, fontFamily: "'Unbounded',sans-serif", paddingRight: 20 }}>
          {headline}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>{subheadline}</div>

        {ctaFail && (
          <div style={{ position: "relative" }}>
            {pinFor(2) && <Pin id={2} label={pinFor(2)!.label} color={pinFor(2)!.color} activeId={activeId} setActiveId={setActiveId} x="calc(100% - 28px)" y={0} />}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <div style={{ padding: "7px 16px", background: "linear-gradient(135deg,#186132,#14D571)", borderRadius: 6, fontSize: 11.5, fontWeight: 700, color: "#fff", boxShadow: "0 2px 10px rgba(20,140,89,0.3)" }}>
                {ctaLabel}
              </div>
              <div style={{ padding: "6px 14px", border: "1.5px solid #148C59", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "#148C59" }}>
                See 90-second demo
              </div>
            </div>
            {ctaMicro && <div style={{ fontSize: 10, color: C.dim }}>{ctaMicro}</div>}
          </div>
        )}

        {trustFail && (
          <div style={{ position: "relative", marginTop: ctaFail ? 14 : 0 }}>
            {pinFor(ctaFail ? 3 : 2) && <Pin id={ctaFail ? 3 : 2} label={pinFor(ctaFail ? 3 : 2)!.label} color={pinFor(ctaFail ? 3 : 2)!.color} activeId={activeId} setActiveId={setActiveId} x="calc(100% - 28px)" y={0} />}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[32, 26, 28, 30, 24].map((w, i) => (
                  <div key={i} style={{ height: 14, width: w, background: "rgba(11,28,72,0.12)", borderRadius: 2 }} />
                ))}
              </div>
              <div style={{ fontSize: 9.5, color: C.dim }}>Trusted by 800+ teams</div>
            </div>
          </div>
        )}
      </div>

      {/* Features */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #F3F4F6", position: "relative" }}>
        {copyFail && (() => {
          const ann = annotations.find(a => a.label.includes("outcome language"));
          return ann ? <Pin id={ann.id} label={ann.label} color={ann.color} activeId={activeId} setActiveId={setActiveId} x="calc(100% - 28px)" y={0} /> : null;
        })()}
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: C.dim, marginBottom: 6 }}>FEATURES</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 8 }}>
          {copyFail ? "Built around what you actually need" : "Everything you need"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {(copyFail
            ? [["You always know what's next", "Real-time clarity"], ["Your team acts faster", "Instant dashboards"], ["No more guesswork", "Outcome reports"]]
            : [["Real-time dashboards", "We built this for you"], ["Custom reports", "Our team designed it"], ["Collaboration tools", "Built-in features"]]
          ).map(([h, s], i) => (
            <div key={i} style={{ padding: 8, background: copyFail ? "rgba(20,213,113,0.04)" : "#F9FAFB", borderRadius: 5, border: `1px solid ${copyFail ? "rgba(20,213,113,0.15)" : "#E5E7EB"}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.navy, marginBottom: 2, lineHeight: 1.3 }}>{h}</div>
              <div style={{ fontSize: 9.5, color: C.dim }}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Social proof */}
      {socialFail && (
        <div style={{ padding: "14px 18px", position: "relative" }}>
          {(() => {
            const ann = annotations.find(a => a.label.includes("Testimonial"));
            return ann ? <Pin id={ann.id} label={ann.label} color={ann.color} activeId={activeId} setActiveId={setActiveId} x="calc(100% - 28px)" y={0} /> : null;
          })()}
          <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 8 }}>What our customers say</div>
          <div style={{ padding: "10px 12px", borderRadius: 6, background: "rgba(20,213,113,0.05)", border: "1px solid rgba(20,213,113,0.15)", fontSize: 11, color: C.navy, lineHeight: 1.55, fontStyle: "italic" }}>
            "Exactly what we needed. Saw results in the first week."
            <div style={{ fontSize: 10, color: C.dim, marginTop: 4, fontStyle: "normal" }}>— Head of Growth, verified customer</div>
          </div>
        </div>
      )}

      {/* Vision badge */}
      <div style={{ position: "absolute", bottom: 10, right: 12, display: "flex", alignItems: "center", gap: 5, background: "rgba(20,213,113,0.12)", border: "1px solid rgba(20,213,113,0.25)", borderRadius: 20, padding: "3px 10px" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.mint }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: C.emerald }}>Vision applied</span>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────── */
export default function ProVision({ auditId }: { auditId: string }) {
  const [view, setView] = useState<"vision" | "split">("vision");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [vision, setVision] = useState<ReturnType<typeof buildVision> | null>(null);
  const [domain, setDomain] = useState("");

  useEffect(() => {
    async function load() {
      // Check sessionStorage first (populated by the audit engine on completion)
      const cached = sessionStorage.getItem(`audit:${auditId}`);
      if (cached) {
        try {
          const c = JSON.parse(cached);
          const d = c.domain ?? "yoursite.com";
          const rawFindings = (c.findings ?? []).map((f: any) => ({
            check_id: f.id, pass: f.pass, manual_review: false, name: f.name,
          }));
          setDomain(d);
          setVision(buildVision(d, rawFindings, c.domData ?? null, c.visionRewrite ?? null, c.storyFixes ?? null));
          setLoading(false);
          return;
        } catch {}
      }

      // Fallback: fetch from Supabase
      const supabase = getSupabase();
      const [{ data: auditData }, { data: findingsData }] = await Promise.all([
        supabase.from("audits").select("domain,score,dom_data,vision_rewrite,story_fixes").eq("id", auditId).maybeSingle(),
        supabase.from("audit_findings").select("check_id,pass,manual_review,name").eq("audit_id", auditId),
      ]);
      const d = auditData?.domain ?? "yoursite.com";
      setDomain(d);
      setVision(buildVision(d, findingsData ?? [], auditData?.dom_data ?? null, auditData?.vision_rewrite ?? null, auditData?.story_fixes ?? null));
      setLoading(false);
    }
    load();
  }, [auditId]);

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

        <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.muted, fontFamily: "'Space Grotesk',sans-serif", padding: 0, marginBottom: 24 }}>
          ← Back to report
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 24, fontWeight: 700, color: C.navy, margin: 0, letterSpacing: "-0.5px" }}>
            UXpact{" "}
            <span style={{ background: "linear-gradient(90deg,#186132,#14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Vision
            </span>
          </h1>
          <div style={{ fontSize: 9, fontWeight: 700, background: "rgba(91,97,244,0.1)", color: C.violet, borderRadius: 20, padding: "4px 12px", letterSpacing: "0.04em" }}>Free during beta</div>
        </div>
        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px", lineHeight: 1.65 }}>
          {domain
            ? `Every audit finding from ${domain.replace(/^https?:\/\//, "")} applied — rewritten copy, repositioned CTAs, trust signals placed where they convert. Click numbered pins to see what changed and why.`
            : "Every audit finding applied — rewritten copy, repositioned CTAs, trust signals placed where they convert."}
        </p>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: C.dim, fontSize: 13 }}>Building vision…</div>
        ) : !vision ? (
          <div style={{ padding: 40, textAlign: "center", color: C.dim, fontSize: 13 }}>Could not load audit data.</div>
        ) : (
          <>
            {/* Change chips */}
            {vision.changes.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
                {vision.changes.map(([t, c]) => (
                  <div key={t} style={{ fontSize: 11, fontWeight: 600, color: c, background: `${c}18`, border: `1px solid ${c}30`, borderRadius: 5, padding: "4px 10px" }}>{t}</div>
                ))}
              </div>
            )}

            {/* Annotation legend */}
            {vision.annotations.length > 0 && (
              <div style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(16px)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.7)", padding: "12px 16px", marginBottom: 18, display: "flex", flexWrap: "wrap", gap: 10 }}>
                {vision.annotations.map(a => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setActiveId(activeId === a.id ? null : a.id)}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: a.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 8, fontWeight: 800, color: "#fff" }}>{a.id}</span>
                    </div>
                    <span style={{ fontSize: 11, color: activeId === a.id ? C.navy : C.muted, fontWeight: activeId === a.id ? 600 : 400 }}>{a.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* View toggle */}
            <div style={{ display: "inline-flex", borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden", marginBottom: 20 }}>
              {(["vision", "split"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  style={{ padding: "8px 20px", fontSize: 12, fontWeight: view === v ? 700 : 400, color: view === v ? C.emerald : C.dim, background: view === v ? "rgba(20,213,113,0.1)" : "rgba(255,255,255,0.7)", border: "none", cursor: "pointer", transition: "all 0.2s", fontFamily: "'Space Grotesk',sans-serif" }}>
                  {v === "vision" ? "Vision ✦" : "Side by side"}
                </button>
              ))}
            </div>

            {/* Mockup */}
            <div style={{ animation: "fadeUp 0.35s ease both" }}>
              {view === "vision" && (
                <div style={{ maxWidth: 640 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.mint, marginBottom: 8 }}>Vision ✦ — all findings applied</div>
                  <VisionMockup vision={vision} activeId={activeId} setActiveId={setActiveId} />
                </div>
              )}
              {view === "split" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.dim, marginBottom: 8 }}>Current structure</div>
                    {/* Static representation of common problem patterns */}
                    <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
                      <div style={{ padding: "10px 16px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: C.navy }}>{vision.domainLabel}</div>
                        <div style={{ display: "flex", gap: 10, fontSize: 10.5, color: C.dim, alignItems: "center" }}>
                          {(vision.navLinks.length > 0 ? vision.navLinks.slice(0, 3) : ["Home", "Features", "Pricing"]).map((t: string) => <span key={t}>{t}</span>)}
                          <span style={{ padding: "3px 10px", border: `1px solid rgba(0,0,0,0.15)`, borderRadius: 4, fontSize: 10, color: C.muted }}>{vision.currentCta}</span>
                        </div>
                      </div>
                      <div style={{ padding: "20px 16px", borderBottom: "1px solid #F3F4F6" }}>
                        {vision.h1Fail && (
                          <>
                            <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 4, lineHeight: 1.3, fontFamily: "'Unbounded',sans-serif", opacity: 0.5 }}>{vision.currentH1}</div>
                            <div style={{ fontSize: 10, color: "#DC2626", marginBottom: 10 }}>⚠ Feature-led H1 — no clear user benefit</div>
                          </>
                        )}
                        {vision.ctaFail && (
                          <>
                            <div style={{ fontSize: 10, color: C.dim, marginBottom: 10, lineHeight: 1.5 }}>A paragraph of copy before any call to action appears below...</div>
                            <div style={{ height: 28, width: "40%", background: "rgba(0,0,0,0.07)", borderRadius: 4, marginBottom: 4 }} />
                            <div style={{ fontSize: 10, color: "#DC2626" }}>⚠ CTA pushed below fold on mobile</div>
                          </>
                        )}
                        {!vision.h1Fail && !vision.ctaFail && (
                          <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6 }}>Current page structure — no critical hero issues detected by the audit engine.</div>
                        )}
                      </div>
                      {vision.trustFail && (
                        <div style={{ padding: "12px 16px" }}>
                          <div style={{ background: "#FFF4E6", border: "1px solid #FFD580", borderRadius: 4, padding: "8px 10px", fontSize: 10, color: "#92400E" }}>
                            ⚠ No social proof near CTA — trust signals missing at the moment of decision
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.mint, marginBottom: 8 }}>Vision ✦ — all findings applied</div>
                    <VisionMockup vision={vision} activeId={activeId} setActiveId={setActiveId} />
                  </div>
                </div>
              )}
            </div>

            {/* Note */}
            <div style={{ marginTop: 24, padding: "12px 16px", background: "rgba(91,97,244,0.05)", border: "1px solid rgba(91,97,244,0.12)", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
                <strong style={{ color: C.violet }}>About Vision:</strong> This mockup is built directly from your audit results — each change shown corresponds to a failing check. The copy, CTAs, and structure reflect UX/CRO best practices applied to {domain.replace(/^https?:\/\//, "") || "your site"}. It's a strategic wireframe, not a pixel-perfect redesign.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
