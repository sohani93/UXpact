import { useEffect, useRef, useState } from "react";
import { color, font, glass, gradient, radius } from "../theme";
import type { Diagnosis, JourneyBreak } from "../lib/types";
import { generateVisionRebuild, deployVariant, embedSnippetFor } from "../lib/api";
import { getDb } from "../lib/db";
import Reveal from "../shared/Reveal";

const DEFAULT_SECTION_ORDER = ["hero", "features", "social", "pricing", "cta2"];
const ZONE_LABEL: Record<string, string> = { nav: "Nav", hero: "Hero", features: "Features", social: "Customers", pricing: "Pricing", cta2: "Bottom CTA" };
const STAGE_TO_ZONE: Record<string, string> = { arrival: "hero", understanding: "features", "trust-building": "social", decision: "pricing", action: "cta2" };

// Story direction is presented as what it does to the copy, never the bare
// archetype name — the archetype itself is passed to generation but never
// shown as a personality-quiz label.
const STORY_DIRECTIONS: { archetype: string; label: string; hint: string }[] = [
  { archetype: "Hero", label: "Fast, outcome-first", hint: "Lead with results, urgency, momentum." },
  { archetype: "Sage", label: "Expert & credible", hint: "Lead with proof, method, depth." },
  { archetype: "Outlaw", label: "Bold & different", hint: "Lead with contrast to the status quo." },
  { archetype: "Caregiver", label: "Warm & supportive", hint: "Lead with reassurance and care." },
  { archetype: "Creator", label: "Crafted & original", hint: "Lead with craft and originality." },
  { archetype: "Ruler", label: "Premium & authoritative", hint: "Lead with exclusivity and authority." },
];

function zoneForBreak(jb: JourneyBreak): string {
  const text = jb.element.toLowerCase();
  if (/testimonial|trust|social proof|review|logo/.test(text)) return "social";
  if (/pricing|price|plan|cost/.test(text)) return "pricing";
  if (/\bcta\b|bottom cta|call.to.action/.test(text)) return "cta2";
  if (/hero|headline|\bh1\b/.test(text)) return "hero";
  if (/feature/.test(text)) return "features";
  return STAGE_TO_ZONE[jb.journeyStage] ?? "features";
}

function Pin({ number, active, addressed, onClick, label }: { number: number; active: boolean; addressed: boolean; onClick: () => void; label: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: 30, height: 30, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0,
          background: addressed ? color.forest : active ? "#4348D4" : color.violet,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          boxShadow: hover || active ? "0 4px 14px rgba(11,28,72,0.28)" : "0 2px 8px rgba(11,28,72,0.16)",
          transform: active ? "scale(1.2)" : hover ? "scale(1.1)" : "scale(1)",
          transition: "all 0.18s ease", opacity: addressed ? 0.65 : 1,
        }}
      >
        <span style={{ fontFamily: font.body, fontSize: addressed ? 13 : 11.5, fontWeight: 700, color: "#fff" }}>{addressed ? "✓" : number}</span>
      </button>
      {hover && !active && (
        <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: color.navy, color: "#fff", fontSize: 11, lineHeight: 1.5, padding: "6px 11px", borderRadius: 7, whiteSpace: "nowrap", zIndex: 60, pointerEvents: "none", fontFamily: font.body, maxWidth: 220, textAlign: "center" }}>
          {label}
        </div>
      )}
    </div>
  );
}

function FixDrawer({ jb, addressed, onToggle, onClose }: { jb: JourneyBreak; addressed: boolean; onToggle: () => void; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ ...glass, borderRadius: radius.lg, width: 340, flexShrink: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${color.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div>
            <div style={{ fontFamily: font.body, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: color.violet, marginBottom: 5 }}>{jb.journeyStage.replace("-", " ")}</div>
            <div style={{ fontFamily: font.display, fontSize: 13.5, fontWeight: 700, color: color.navy }}>{jb.element}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: color.dim, lineHeight: 1 }}>×</button>
        </div>
      </div>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${color.border}` }}>
        <div style={{ fontFamily: font.body, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: color.muted, marginBottom: 6 }}>What's happening</div>
        <p style={{ fontFamily: font.body, fontSize: 12.5, color: "#374151", lineHeight: 1.65, margin: "0 0 10px" }}>{jb.whatsHappening}</p>
        <div style={{ fontFamily: font.body, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: color.muted, marginBottom: 6 }}>Fix</div>
        <p style={{ fontFamily: font.body, fontSize: 13, color: "#374151", lineHeight: 1.7, margin: 0 }}>{jb.fix}</p>
      </div>
      <div style={{ padding: "14px 16px", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontFamily: font.body, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: color.muted }}>AI-ready prompt</div>
          <button onClick={() => { navigator.clipboard.writeText(jb.aiPrompt); setCopied(true); setTimeout(() => setCopied(false), 1400); }} style={{ background: copied ? gradient.brand : "rgba(255,255,255,0.8)", border: copied ? "none" : `1px solid ${color.border}`, borderRadius: 7, width: 28, height: 28, cursor: "pointer" }}>
            {copied ? "✓" : "⧉"}
          </button>
        </div>
        <div style={{ background: "rgba(255,255,255,0.8)", border: `1px solid ${color.border}`, borderRadius: 8, padding: "11px 13px", fontSize: 11.5, lineHeight: 1.65, color: "#374151", whiteSpace: "pre-wrap", fontFamily: font.body }}>{jb.aiPrompt}</div>
      </div>
      <div style={{ padding: "10px 16px", borderTop: `1px solid ${color.border}` }}>
        <button onClick={onToggle} style={{
          width: "100%", padding: "9px 0", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: font.body,
          background: addressed ? gradient.brand : "rgba(91,97,244,0.08)", border: addressed ? "none" : "1px solid rgba(91,97,244,0.3)",
          color: addressed ? "#fff" : color.violet,
        }}>{addressed ? "✓ Addressed" : "Mark as addressed"}</button>
      </div>
    </div>
  );
}

function PageFacsimile({ diagnosis, pins, activeId, setActiveId, isAddressed }: {
  diagnosis: Diagnosis; pins: { id: string; zone: string; number: number; jb: JourneyBreak }[];
  activeId: string | null; setActiveId: (id: string | null) => void; isAddressed: (id: string) => boolean;
}) {
  const dom = diagnosis.domData;
  const zoneRow = (zone: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
      {pins.filter((p) => p.zone === zone).map((p) => (
        <Pin key={p.id} number={p.number} active={activeId === p.id} addressed={isAddressed(p.id)} onClick={() => setActiveId(activeId === p.id ? null : p.id)} label={p.jb.element} />
      ))}
    </div>
  );
  return (
    <div style={{ flex: 1, borderRadius: radius.lg, ...glass, overflow: "hidden" }}>
      <div style={{ background: "rgba(11,28,72,0.03)", borderBottom: `1px solid ${color.border}`, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 5 }}>{["#ef4444", "#f59e0b", "#22c55e"].map((c) => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.4 }} />)}</div>
        <div style={{ flex: 1, background: "rgba(11,28,72,0.04)", borderRadius: 5, padding: "3px 10px", fontSize: 11, color: color.dim, textAlign: "center", fontFamily: font.body }}>https://{diagnosis.domain}</div>
      </div>
      <div style={{ display: "flex", gap: 14, padding: "14px 24px", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: font.display, fontSize: 13, fontWeight: 700, color: color.navy }}>{diagnosis.domain.split(".")[0]}</span>
          {zoneRow("nav")}
        </div>
        <div style={{ display: "flex", gap: 14 }}>{(dom.navLinks.length ? dom.navLinks.slice(0, 4) : ["Home", "Features", "Pricing"]).map((l) => <span key={l} style={{ fontSize: 11.5, color: color.muted, fontFamily: font.body }}>{l}</span>)}</div>
      </div>
      <div style={{ textAlign: "center", padding: "40px 40px 32px", background: gradient.brandSoft }}>
        <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 700, color: color.navy, lineHeight: 1.3, marginBottom: 10 }}>{dom.h1Text}</div>
        <div style={{ fontFamily: font.body, fontSize: 12.5, color: color.muted, maxWidth: 400, margin: "0 auto 18px" }}>{dom.paragraphTexts[0]?.slice(0, 140) ?? ""}</div>
        <div style={{ display: "inline-block", padding: "8px 22px", background: gradient.brand, borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, fontFamily: font.body }}>{dom.ctaTexts[0] ?? "Get Started"}</div>
        {zoneRow("hero")}
      </div>
      <div style={{ padding: "22px 24px" }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", color: color.dim, textTransform: "uppercase", marginBottom: 10, fontFamily: font.body }}>Features</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {(dom.h2Texts.length >= 3 ? dom.h2Texts.slice(0, 3) : ["Feature one", "Feature two", "Feature three"]).map((t, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.6)", border: `1px solid ${color.border}`, borderRadius: 9, padding: "12px 13px", fontSize: 12, fontWeight: 600, color: color.navy, fontFamily: font.body }}>{t}</div>
          ))}
        </div>
        {zoneRow("features")}
      </div>
      <div style={{ padding: "22px 24px", background: "rgba(91,97,244,0.03)" }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", color: color.dim, textTransform: "uppercase", marginBottom: 10, fontFamily: font.body }}>Customers</div>
        {dom.testimonialTexts.length > 0 ? (
          <div style={{ fontSize: 12, color: color.muted, fontStyle: "italic", fontFamily: font.body }}>&ldquo;{dom.testimonialTexts[0].slice(0, 150)}&rdquo;</div>
        ) : dom.trustLogoLabels.length > 0 ? (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{dom.trustLogoLabels.map((l, i) => <span key={i} style={{ fontSize: 11, color: color.muted, background: "rgba(11,28,72,0.05)", padding: "4px 10px", borderRadius: 5, fontFamily: font.body }}>{l}</span>)}</div>
        ) : (
          <span style={{ fontSize: 11.5, color: color.dim, fontFamily: font.body }}>No testimonials or trust logos detected.</span>
        )}
        {zoneRow("social")}
      </div>
      <div style={{ padding: "22px 24px" }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", color: color.dim, textTransform: "uppercase", marginBottom: 10, fontFamily: font.body }}>Pricing</div>
        {dom.pricingTiers.length > 0 ? (
          <div style={{ display: "flex", gap: 10 }}>{dom.pricingTiers.map((t, i) => <div key={i} style={{ flex: 1, textAlign: "center", padding: "10px 8px", background: "rgba(255,255,255,0.6)", borderRadius: 8, border: `1px solid ${color.border}` }}><div style={{ fontSize: 11, color: color.muted, fontFamily: font.body }}>{t.name}</div><div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 700, color: color.navy }}>{t.price}</div></div>)}</div>
        ) : (
          <span style={{ fontSize: 11.5, color: color.dim, fontFamily: font.body }}>No pricing detected on this page.</span>
        )}
        {zoneRow("pricing")}
      </div>
      <div style={{ padding: "22px 24px", textAlign: "center", background: gradient.violetSoft }}>
        <div style={{ fontFamily: font.display, fontSize: 15, fontWeight: 700, color: color.navy, marginBottom: 12 }}>{dom.ctaTexts[1] ?? "Ready to get started?"}</div>
        <div style={{ display: "inline-block", padding: "8px 22px", background: gradient.brand, borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, fontFamily: font.body }}>{dom.ctaTexts[0] ?? "Get Started"}</div>
        {zoneRow("cta2")}
      </div>
    </div>
  );
}

// Vision Pro is always visible — never a section that only exists after a
// deploy already happened. It explains itself, then upgrades to real data
// the moment a variant goes live.
function VisionProPanel({ auditId, generatedHtml, isLive, activeVariants, variantCounts }: {
  auditId: string; generatedHtml: string | null; isLive: boolean;
  activeVariants: { id: string; traffic_weight: number | null }[];
  variantCounts: Record<string, { serves: number; converts: number }>;
}) {
  return (
    <div style={{ ...glass, borderRadius: radius.lg, padding: "20px 22px", marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: isLive ? color.forest : color.dim, animation: isLive ? "pulseDot 2s infinite" : "none" }} />
        <span style={{ fontFamily: font.display, fontSize: 13.5, fontWeight: 700, color: color.navy }}>Vision Pro</span>
        <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(91,97,244,0.1)", color: color.violet, borderRadius: radius.pill, padding: "2px 9px", fontFamily: font.body }}>Live traffic split</span>
      </div>
      {!isLive ? (
        <p style={{ fontFamily: font.body, fontSize: 12.5, color: color.muted, margin: 0, lineHeight: 1.6 }}>
          Once you deploy a generated rebuild, Vision Pro splits real visitor traffic across every live version and shifts weight toward whichever one actually converts better — no manual A/B setup. {generatedHtml ? "You have a generated version ready — deploy it above to start." : "Generate a rebuild above, then deploy it, to start a live test."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {activeVariants.map((v, i) => {
            const counts = variantCounts[v.id] ?? { serves: 0, converts: 0 };
            const pct = Math.round((v.traffic_weight ?? 1 / activeVariants.length) * 100);
            return <div key={v.id} style={{ fontFamily: font.body, fontSize: 12.5, color: "#374151" }}><span style={{ fontWeight: 700 }}>Variant {i + 1}</span> — {pct}% of traffic · {counts.serves} served · {counts.converts} converted</div>;
          })}
        </div>
      )}
    </div>
  );
}

export default function BlueprintSection({ diagnosis }: { diagnosis: Diagnosis }) {
  const [view, setView] = useState<"current" | "restructured">("current");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addressed, setAddressed] = useState<Record<string, boolean>>({});

  const [archetype, setArchetype] = useState<string>(diagnosis.targetArchetype ?? "Hero");
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [copySelections, setCopySelections] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [activeVariants, setActiveVariants] = useState<{ id: string; traffic_weight: number | null }[]>([]);
  const [variantCounts, setVariantCounts] = useState<Record<string, { serves: number; converts: number }>>({});
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const stepRef = useRef<number | null>(null);
  const [stepMsg, setStepMsg] = useState("Parsing your site's real structure…");

  const breaks = diagnosis.journeyBreaks ?? [];
  const pins = breaks.map((jb, i) => ({ id: `jb-${i}`, zone: zoneForBreak(jb), number: i + 1, jb }));
  const activePin = pins.find((p) => p.id === activeId) ?? null;

  useEffect(() => {
    const seeded: Record<string, string> = {};
    breaks.forEach((jb) => { const z = zoneForBreak(jb); if (!seeded[z]) seeded[z] = jb.fix; });
    DEFAULT_SECTION_ORDER.forEach((z) => { if (!seeded[z]) seeded[z] = "Keep this section's current copy."; });
    setCopySelections(seeded);
  }, [diagnosis.auditId]);

  const refreshVariants = async () => {
    const db = getDb();
    const { data } = await db.from("deployed_variants").select("id, traffic_weight").eq("audit_id", diagnosis.auditId).eq("is_active", true);
    const rows = data ?? [];
    setIsLive(rows.length > 0);
    setActiveVariants(rows);
    if (rows.length === 0) return;
    const { data: events } = await db.from("variant_events").select("deployed_variant_id, event_type").in("deployed_variant_id", rows.map((r) => r.id));
    const counts: Record<string, { serves: number; converts: number }> = {};
    rows.forEach((r) => { counts[r.id] = { serves: 0, converts: 0 }; });
    (events ?? []).forEach((e) => { const c = counts[e.deployed_variant_id]; if (!c) return; if (e.event_type === "serve") c.serves++; else if (e.event_type === "convert") c.converts++; });
    setVariantCounts(counts);
  };
  useEffect(() => { void refreshVariants(); }, [diagnosis.auditId]);

  const handleGenerate = async () => {
    if (!diagnosis.rawHtml) { setGenError("This read predates raw HTML capture — run a fresh read of the site to continue."); return; }
    setGenerating(true);
    setGenError(null);
    const steps = ["Parsing your site's real structure…", "Reordering sections…", "Rewriting copy for the story…", "Checking the rebuild against your diagnosis…"];
    let i = 0;
    stepRef.current = window.setInterval(() => { i = Math.min(i + 1, steps.length - 1); setStepMsg(steps[i]); }, 1400);
    try {
      const result = await generateVisionRebuild({ auditId: diagnosis.auditId, archetype, sectionOrder, copySelections, rawHtml: diagnosis.rawHtml });
      if ("error" in result) { setGenError(result.error); setGeneratedHtml(null); }
      else setGeneratedHtml(result.html);
    } finally {
      if (stepRef.current) window.clearInterval(stepRef.current);
      setGenerating(false);
    }
  };

  const handleDeploy = async (multiArmed = false) => {
    if (!generatedHtml || !diagnosis.rawHtml) return;
    setDeploying(true);
    setDeployError(null);
    const result = await deployVariant({ auditId: diagnosis.auditId, domain: diagnosis.domain, generatedHtml, rawHtml: diagnosis.rawHtml, zones: sectionOrder, multiArmed });
    if (!result.ok) setDeployError(result.message);
    else await refreshVariants();
    setDeploying(false);
  };

  const handleRollback = async () => {
    const db = getDb();
    await db.from("deployed_variants").update({ is_active: false }).eq("audit_id", diagnosis.auditId).eq("is_active", true);
    await refreshVariants();
  };

  const copySnippet = () => { navigator.clipboard.writeText(embedSnippetFor(diagnosis.auditId)); setCopiedSnippet(true); setTimeout(() => setCopiedSnippet(false), 1400); };

  return (
    <section id="blueprint" style={{ maxWidth: 1160, margin: "0 auto", padding: "40px 28px" }}>
      <Reveal>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 22 }}>
          <div>
            <h1 style={{ fontFamily: font.display, fontSize: 30, fontWeight: 700, color: color.navy, letterSpacing: "-0.6px", margin: "0 0 6px" }}>
              Conversion <span style={{ background: gradient.text, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Blueprint</span>
            </h1>
            <p style={{ fontFamily: font.body, fontSize: 14, color: color.muted, margin: 0 }}>
              {view === "current" ? `Every journey break pinned to where it really happens (${pins.length}).` : "Pick a direction, decide what changes, generate a real rebuild."}
            </p>
          </div>
          <div style={{ display: "flex", background: "rgba(11,28,72,0.05)", borderRadius: 9, padding: 3, gap: 2 }}>
            {(["current", "restructured"] as const).map((v) => (
              <button key={v} onClick={() => { setView(v); setActiveId(null); }} style={{
                padding: "7px 16px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: font.body, fontSize: 12, fontWeight: 700,
                background: view === v ? (v === "restructured" ? gradient.brand : "#fff") : "transparent",
                color: view === v ? (v === "restructured" ? "#fff" : color.navy) : color.muted,
                boxShadow: view === v && v === "current" ? "0 1px 4px rgba(11,28,72,0.1)" : "none",
              }}>{v === "current" ? "Current" : "Restructured"}</button>
            ))}
          </div>
        </div>
      </Reveal>

      {view === "current" ? (
        <Reveal delay={0.05}>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
            <PageFacsimile diagnosis={diagnosis} pins={pins} activeId={activeId} setActiveId={setActiveId} isAddressed={(id) => addressed[id] ?? false} />
            <div style={{ position: "sticky", top: 90, width: 340, flexShrink: 0 }}>
              {activePin ? (
                <FixDrawer jb={activePin.jb} addressed={addressed[activePin.id] ?? false} onToggle={() => setAddressed((a) => ({ ...a, [activePin.id]: !a[activePin.id] }))} onClose={() => setActiveId(null)} />
              ) : pins.length === 0 ? (
                <div style={{ ...glass, borderRadius: radius.lg, padding: "32px 22px", textAlign: "center" }}>
                  <div style={{ fontFamily: font.display, fontSize: 13.5, fontWeight: 700, color: color.navy, marginBottom: 6 }}>No journey breaks pinned</div>
                  <div style={{ fontFamily: font.body, fontSize: 12, color: color.muted, lineHeight: 1.6 }}>The diagnosis didn't flag any breaks in the visitor's journey for this run.</div>
                </div>
              ) : (
                <div style={{ ...glass, borderRadius: radius.lg, padding: "32px 22px", textAlign: "center" }}>
                  <div style={{ fontFamily: font.display, fontSize: 13.5, fontWeight: 700, color: color.navy, marginBottom: 6 }}>Click a pin</div>
                  <div style={{ fontFamily: font.body, fontSize: 12, color: color.muted, lineHeight: 1.6 }}>Each numbered dot marks a real break in the visitor's journey, placed where it happens on the page.</div>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      ) : (
        <Reveal delay={0.05}>
          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18, alignItems: "flex-start" }}>
            <div style={{ ...glass, borderRadius: radius.lg, padding: "20px", position: "sticky", top: 90 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: color.dim, marginBottom: 10, fontFamily: font.body }}>Story direction</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                {STORY_DIRECTIONS.map((d) => (
                  <button key={d.archetype} onClick={() => setArchetype(d.archetype)} style={{
                    textAlign: "left", padding: "9px 12px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: font.body,
                    background: archetype === d.archetype ? gradient.brand : "rgba(11,28,72,0.04)",
                    color: archetype === d.archetype ? "#fff" : color.navy,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{d.label}</div>
                    <div style={{ fontSize: 10.5, opacity: 0.85 }}>{d.hint}</div>
                  </button>
                ))}
              </div>

              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: color.dim, marginBottom: 10, fontFamily: font.body }}>Section order</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                {sectionOrder.map((zone, i) => (
                  <div key={zone} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.6)", border: `1px solid ${color.border}`, borderRadius: 8, padding: "7px 10px" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: color.navy, flex: 1, fontFamily: font.body }}>{ZONE_LABEL[zone] ?? zone}</span>
                    <button onClick={() => setSectionOrder((o) => { const n = [...o]; if (i > 0) [n[i], n[i - 1]] = [n[i - 1], n[i]]; return n; })} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.3 : 1, fontSize: 13, color: color.muted }}>↑</button>
                    <button onClick={() => setSectionOrder((o) => { const n = [...o]; if (i < n.length - 1) [n[i], n[i + 1]] = [n[i + 1], n[i]]; return n; })} disabled={i === sectionOrder.length - 1} style={{ background: "none", border: "none", cursor: i === sectionOrder.length - 1 ? "default" : "pointer", opacity: i === sectionOrder.length - 1 ? 0.3 : 1, fontSize: 13, color: color.muted }}>↓</button>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: color.dim, marginBottom: 10, fontFamily: font.body }}>What to change</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {sectionOrder.map((zone) => (
                  <div key={zone}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: color.navy, marginBottom: 4, fontFamily: font.body }}>{ZONE_LABEL[zone] ?? zone}</div>
                    <textarea value={copySelections[zone] ?? ""} onChange={(e) => setCopySelections((c) => ({ ...c, [zone]: e.target.value }))} rows={2} style={{ width: "100%", boxSizing: "border-box", resize: "vertical", fontSize: 11.5, padding: "7px 9px", borderRadius: 7, border: `1px solid ${color.border}`, background: "rgba(255,255,255,0.7)", color: "#374151", fontFamily: font.body }} />
                  </div>
                ))}
              </div>

              <button onClick={handleGenerate} disabled={generating} style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", cursor: generating ? "default" : "pointer", background: generating ? "rgba(24,97,50,0.4)" : gradient.brand, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: font.display }}>
                {generating ? "Generating…" : generatedHtml ? "Regenerate" : "Generate"}
              </button>
            </div>

            <div>
              <div style={{ ...glass, borderRadius: radius.lg, overflow: "hidden", minHeight: 520, display: "flex", flexDirection: "column" }}>
                <div style={{ background: "rgba(11,28,72,0.03)", borderBottom: `1px solid ${color.border}`, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", gap: 5 }}>{["#ef4444", "#f59e0b", "#22c55e"].map((c) => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.4 }} />)}</div>
                  <div style={{ flex: 1, background: "rgba(11,28,72,0.04)", borderRadius: 5, padding: "3px 10px", fontSize: 11, color: color.dim, textAlign: "center", fontFamily: font.body }}>https://{diagnosis.domain}</div>
                  {generatedHtml && !generating && (
                    <div style={{ display: "flex", gap: 6 }}>
                      {isLive ? (
                        <>
                          <button onClick={() => handleDeploy(true)} disabled={deploying} style={{ padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", background: "rgba(91,97,244,0.12)", color: color.violet, fontSize: 11, fontWeight: 700, fontFamily: font.body }}>{deploying ? "Adding…" : "Add live test variant"}</button>
                          <button onClick={handleRollback} style={{ padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", background: "rgba(179,38,30,0.08)", color: color.danger, fontSize: 11, fontWeight: 700, fontFamily: font.body }}>Rollback</button>
                        </>
                      ) : (
                        <button onClick={() => handleDeploy(false)} disabled={deploying} style={{ padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", background: color.violet, color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: font.body }}>{deploying ? "Deploying…" : "Deploy"}</button>
                      )}
                    </div>
                  )}
                </div>
                {isLive && (
                  <div style={{ padding: "10px 16px", background: "rgba(20,140,89,0.06)", borderBottom: `1px solid ${color.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: color.forest, fontFamily: font.body }}>Live —</span>
                    <code style={{ fontSize: 10.5, color: "#374151", background: "rgba(255,255,255,0.7)", padding: "3px 8px", borderRadius: 5, fontFamily: "monospace", flex: 1, minWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{embedSnippetFor(diagnosis.auditId)}</code>
                    <button onClick={copySnippet} style={{ padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", background: copiedSnippet ? gradient.brand : "rgba(11,28,72,0.06)", color: copiedSnippet ? "#fff" : color.navy, fontSize: 10.5, fontWeight: 700, fontFamily: font.body }}>{copiedSnippet ? "Copied" : "Copy"}</button>
                  </div>
                )}
                {deployError && <div style={{ padding: "8px 16px", background: "rgba(179,38,30,0.06)", fontSize: 11, color: color.danger, fontFamily: font.body }}>{deployError}</div>}
                <div style={{ flex: 1, position: "relative" }}>
                  {generating ? (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(20,140,89,0.15)", borderTopColor: color.forest, animation: "spin 0.8s linear infinite" }} />
                      <div style={{ fontFamily: font.body, fontSize: 13, color: color.navy, fontWeight: 600 }}>{stepMsg}</div>
                    </div>
                  ) : genError ? (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 32, textAlign: "center" }}>
                      <div style={{ fontFamily: font.display, fontSize: 13, fontWeight: 700, color: color.danger }}>Couldn't generate this version</div>
                      <div style={{ fontFamily: font.body, fontSize: 12, color: color.muted, maxWidth: 360, lineHeight: 1.6 }}>{genError}</div>
                      <button onClick={handleGenerate} style={{ marginTop: 6, padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: gradient.brand, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: font.body }}>Try again</button>
                    </div>
                  ) : generatedHtml ? (
                    <iframe title="Vision preview" srcDoc={generatedHtml} sandbox="allow-same-origin allow-scripts" style={{ width: "100%", height: 640, border: "none", display: "block" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 32, textAlign: "center" }}>
                      <div style={{ fontFamily: font.display, fontSize: 13, fontWeight: 700, color: color.navy }}>Ready when you are</div>
                      <div style={{ fontFamily: font.body, fontSize: 12, color: color.muted, maxWidth: 320, lineHeight: 1.6 }}>Pick a direction, adjust the order and copy, then generate a full rebuild of {diagnosis.domain}.</div>
                    </div>
                  )}
                </div>
              </div>
              <VisionProPanel auditId={diagnosis.auditId} generatedHtml={generatedHtml} isLive={isLive} activeVariants={activeVariants} variantCounts={variantCounts} />
            </div>
          </div>
        </Reveal>
      )}
    </section>
  );
}
