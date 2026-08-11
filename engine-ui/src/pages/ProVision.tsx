// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { getSupabase } from "../lib/supabase";
import Nav from "../components/Nav";
import Blobs from "../components/Blobs";

const C = {
  bg: "#EEF1F5", navy: "#0B1C48", forest: "#186132", emerald: "#148C59",
  mint: "#14D571", violet: "#5B61F4", red: "#DC2626", muted: "#6B7280", dim: "#9CA3AF",
  border: "rgba(0,0,0,0.07)",
};

const KEYFRAMES = `
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
button:focus{outline:none}
`;

const ARCHETYPES = ["Hero", "Sage", "Outlaw", "Caregiver", "Creator", "Ruler"] as const;

const ZONE_LABELS: Record<string, string> = {
  hero: "Hero", features: "Features", social: "Social proof", pricing: "Pricing", cta2: "Bottom CTA",
};
const DEFAULT_SECTION_ORDER = ["hero", "features", "social", "pricing", "cta2"];

const GENERATION_STEPS = [
  "Parsing your site's real structure…",
  "Reordering sections…",
  "Rewriting copy for the story…",
  "Rendering preview…",
];

function zoneForFix(text: string): string {
  const t = text.toLowerCase();
  if (/testimonial|trust|social proof|review|logo/.test(t)) return "social";
  if (/pricing|price|plan|cost/.test(t)) return "pricing";
  if (/\bcta\b|bottom cta|call.to.action|objection/.test(t)) return "cta2";
  return "features";
}

function seedCopySelections(visionRewrite: any, storyFixes: string[]): Record<string, string> {
  const seeded: Record<string, string> = {
    hero: visionRewrite?.hero_copy || "Rewrite the hero to lead with the visitor's outcome, not the product.",
  };
  (storyFixes ?? []).forEach((fix) => {
    const zone = zoneForFix(fix);
    if (!seeded[zone]) seeded[zone] = fix;
  });
  DEFAULT_SECTION_ORDER.forEach((zone) => {
    if (!seeded[zone]) seeded[zone] = "Keep this section's current copy.";
  });
  return seeded;
}

const GENERATE_VISION_ENDPOINT =
  import.meta.env.VITE_GENERATE_VISION_ENDPOINT ?? "https://oxminualycvnxofoevjs.supabase.co/functions/v1/generate-vision";

export default function ProVision({ auditId }: { auditId: string }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);

  const [archetype, setArchetype] = useState<string>("");
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [copySelections, setCopySelections] = useState<Record<string, string>>({});

  const [generating, setGenerating] = useState(false);
  const [genStepIndex, setGenStepIndex] = useState(0);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  const stepTimerRef = useRef<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const supabase = getSupabase();
        const [{ data: audit, error: auditErr }, { data: versionRows }] = await Promise.all([
          supabase
            .from("audits")
            .select("domain,dom_data,vision_rewrite,story_fixes,current_archetype,target_archetype,raw_html")
            .eq("id", auditId)
            .maybeSingle(),
          supabase
            .from("vision_versions")
            .select("*")
            .eq("audit_id", auditId)
            .order("version_number", { ascending: true }),
        ]);
        if (auditErr) throw new Error(auditErr.message);
        if (!audit) throw new Error("Audit not found.");
        setAuditData(audit);
        setVersions(versionRows ?? []);
        setArchetype(audit.target_archetype || "Hero");
        setCopySelections(seedCopySelections(audit.vision_rewrite, audit.story_fixes ?? []));
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load this audit.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [auditId]);

  useEffect(() => {
    document.title = auditData?.domain ? `UXpact Vision — ${auditData.domain}` : "UXpact Vision";
  }, [auditData?.domain]);

  const goBack = () => {
    window.history.pushState({}, "", `/report/${auditId}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    setSectionOrder((order) => {
      const next = [...order];
      const target = index + dir;
      if (target < 0 || target >= next.length) return order;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const startStagedSteps = () => {
    setGenStepIndex(0);
    let i = 0;
    stepTimerRef.current = window.setInterval(() => {
      i = Math.min(i + 1, GENERATION_STEPS.length - 1);
      setGenStepIndex(i);
    }, 1400);
  };
  const stopStagedSteps = () => {
    if (stepTimerRef.current) {
      window.clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  };

  const handleGenerate = async () => {
    if (!auditData?.raw_html) return;
    setGenerating(true);
    setGenError(null);
    startStagedSteps();
    try {
      const response = await fetch(GENERATE_VISION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditId,
          archetype,
          sectionOrder,
          copySelections,
          rawHtml: auditData.raw_html,
        }),
      });
      const json = await response.json();
      if (!response.ok || json.error) {
        setGenError(json.message || "Generation failed. Try again.");
        setGeneratedHtml(null);
      } else {
        setGeneratedHtml(json.html);
        setActiveVersionId(null);
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Couldn't reach the Vision service.");
      setGeneratedHtml(null);
    } finally {
      stopStagedSteps();
      setGenerating(false);
    }
  };

  const handleSaveVersion = async () => {
    if (!generatedHtml) return;
    const supabase = getSupabase();
    const nextVersionNumber = (versions[versions.length - 1]?.version_number ?? 0) + 1;
    const { data, error } = await supabase
      .from("vision_versions")
      .insert({
        audit_id: auditId,
        version_number: nextVersionNumber,
        archetype,
        section_order: sectionOrder,
        copy_selections: copySelections,
        html: generatedHtml,
      })
      .select("*")
      .single();
    if (!error && data) {
      setVersions((v) => [...v, data]);
      setActiveVersionId(data.id);
    }
  };

  const handleSelectVersion = (v: any) => {
    setGeneratedHtml(v.html);
    setActiveVersionId(v.id);
    setGenError(null);
    setArchetype(v.archetype || archetype);
    if (Array.isArray(v.section_order) && v.section_order.length) setSectionOrder(v.section_order);
    if (v.copy_selections && typeof v.copy_selections === "object") setCopySelections(v.copy_selections);
  };

  // ── Guard states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 13, color: C.dim, fontFamily: "'Space Grotesk',sans-serif" }}>Loading…</span>
      </div>
    );
  }

  if (loadError || !auditData) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, position: "relative" }}>
        <Blobs />
        <Nav />
        <div style={{ maxWidth: 560, margin: "80px auto 0", padding: "0 28px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 14 }}>⚠️</div>
          <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 16, fontWeight: 700, color: C.red, marginBottom: 8 }}>Couldn't load this audit</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>{loadError}</div>
          <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.violet, fontFamily: "'Space Grotesk',sans-serif" }}>← Back to report</button>
        </div>
      </div>
    );
  }

  if (!auditData.vision_rewrite) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, position: "relative" }}>
        <Blobs />
        <Nav />
        <div style={{ maxWidth: 560, margin: "80px auto 0", padding: "0 28px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 14 }}>🔒</div>
          <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Vision sandbox needs the Claude API key</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>
            This audit doesn't have story narration yet, which the Vision sandbox builds on. Once the Claude API key is configured, re-run the audit and this page will unlock automatically.
          </div>
          <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.violet, fontFamily: "'Space Grotesk',sans-serif" }}>← Back to report</button>
        </div>
      </div>
    );
  }

  if (!auditData.raw_html) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, position: "relative" }}>
        <Blobs />
        <Nav />
        <div style={{ maxWidth: 560, margin: "80px auto 0", padding: "0 28px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 14 }}>🗂️</div>
          <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 8 }}>This audit predates the Vision sandbox</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>
            This audit ran before raw HTML capture was added, so there's nothing for the sandbox to rebuild. Run a fresh audit on this URL to use Vision.
          </div>
          <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.violet, fontFamily: "'Space Grotesk',sans-serif" }}>← Back to report</button>
        </div>
      </div>
    );
  }

  const domainLabel = (auditData.domain || "yoursite.com").replace(/^https?:\/\//, "");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Space Grotesk',sans-serif", position: "relative" }}>
      <style>{KEYFRAMES}</style>
      <Blobs />
      <Nav />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px 60px" }}>
        <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.muted, fontFamily: "'Space Grotesk',sans-serif", padding: 0, marginBottom: 20 }}>
          ← Back to report
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
          <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 26, fontWeight: 700, color: C.navy, margin: 0, letterSpacing: "-0.5px" }}>
            UXpact{" "}
            <span style={{ background: "linear-gradient(90deg,#186132,#14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Vision
            </span>
          </h1>
          <div style={{ fontSize: 9, fontWeight: 700, background: "rgba(91,97,244,0.1)", color: C.violet, borderRadius: 20, padding: "4px 12px", letterSpacing: "0.04em" }}>FREE DURING BETA</div>
        </div>
        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px", lineHeight: 1.65, maxWidth: 640 }}>
          Rebuild {domainLabel} for real — pick a story direction, decide what changes, and generate a full working version of your actual site.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "flex-start" }}>
          {/* ── Left rail — controls ──────────────────────────────── */}
          <div style={{
            background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderRadius: 14, border: "1px solid rgba(255,255,255,0.7)", boxShadow: "0 8px 32px rgba(0,0,0,0.05)",
            padding: "18px 18px 20px", position: "sticky", top: 20,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.dim, marginBottom: 10 }}>Story direction</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
              {ARCHETYPES.map((a) => (
                <button key={a} onClick={() => setArchetype(a)} style={{
                  padding: "6px 12px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'Space Grotesk',sans-serif", transition: "all 0.15s",
                  background: archetype === a ? "linear-gradient(135deg,#186132,#14D571)" : "rgba(0,0,0,0.05)",
                  color: archetype === a ? "#fff" : C.muted,
                  border: "none",
                }}>{a}</button>
              ))}
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.dim, marginBottom: 10 }}>Section order</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              {sectionOrder.map((zone, i) => (
                <div key={zone} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.6)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.navy, flex: 1 }}>{ZONE_LABELS[zone] ?? zone}</span>
                  <button onClick={() => moveSection(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.3 : 1, fontSize: 13, color: C.muted, padding: "0 3px" }}>↑</button>
                  <button onClick={() => moveSection(i, 1)} disabled={i === sectionOrder.length - 1} style={{ background: "none", border: "none", cursor: i === sectionOrder.length - 1 ? "default" : "pointer", opacity: i === sectionOrder.length - 1 ? 0.3 : 1, fontSize: 13, color: C.muted, padding: "0 3px" }}>↓</button>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.dim, marginBottom: 10 }}>What to change</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {sectionOrder.map((zone) => (
                <div key={zone}>
                  <div style={{ fontSize: 11, fontWeight: 650, color: C.navy, marginBottom: 4 }}>{ZONE_LABELS[zone] ?? zone}</div>
                  <textarea
                    value={copySelections[zone] ?? ""}
                    onChange={(e) => setCopySelections((c) => ({ ...c, [zone]: e.target.value }))}
                    rows={2}
                    style={{
                      width: "100%", resize: "vertical", fontSize: 11.5, fontFamily: "'Space Grotesk',sans-serif",
                      padding: "7px 9px", borderRadius: 7, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.7)",
                      color: "#374151", lineHeight: 1.5, boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                width: "100%", padding: "11px 0", borderRadius: 10, border: "none",
                background: generating ? "rgba(24,97,50,0.4)" : "linear-gradient(135deg,#186132,#14D571)",
                color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "'Unbounded',sans-serif",
                cursor: generating ? "default" : "pointer", boxShadow: generating ? "none" : "0 4px 18px rgba(20,140,89,0.3)",
              }}
            >
              {generating ? "Generating…" : generatedHtml ? "Regenerate" : "Generate"}
            </button>
          </div>

          {/* ── Right — output ─────────────────────────────────────── */}
          <div>
            {versions.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {versions.map((v) => (
                  <button key={v.id} onClick={() => handleSelectVersion(v)} style={{
                    padding: "5px 12px", borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'Space Grotesk',sans-serif",
                    background: activeVersionId === v.id ? "rgba(91,97,244,0.14)" : "rgba(255,255,255,0.6)",
                    color: activeVersionId === v.id ? C.violet : C.muted,
                    border: `1px solid ${activeVersionId === v.id ? "rgba(91,97,244,0.35)" : C.border}`,
                  }}>v{v.version_number} · {v.archetype}</button>
                ))}
              </div>
            )}

            <div style={{
              borderRadius: 14, overflow: "hidden", background: "#fff",
              border: "1px solid rgba(255,255,255,0.7)", boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
              minHeight: 520, display: "flex", flexDirection: "column",
            }}>
              <div style={{ background: "rgba(0,0,0,0.03)", borderBottom: `1px solid ${C.border}`, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", gap: 5 }}>
                  {["#ef4444", "#f59e0b", "#22c55e"].map((c) => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.45 }} />)}
                </div>
                <div style={{ flex: 1, background: "rgba(0,0,0,0.04)", borderRadius: 5, padding: "3px 10px", fontSize: 11, color: C.dim, textAlign: "center" }}>
                  https://{domainLabel}
                </div>
                {generatedHtml && !generating && (
                  <button onClick={handleSaveVersion} style={{
                    padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                    background: "rgba(20,140,89,0.12)", color: C.emerald, fontSize: 11, fontWeight: 700,
                    fontFamily: "'Space Grotesk',sans-serif",
                  }}>Save version</button>
                )}
              </div>

              <div style={{ flex: 1, position: "relative" }}>
                {generating ? (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(20,140,89,0.15)", borderTopColor: C.emerald, animation: "spin 0.8s linear infinite" }} />
                    <div style={{ fontSize: 13, color: C.navy, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif" }}>{GENERATION_STEPS[genStepIndex]}</div>
                  </div>
                ) : genError ? (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 32, textAlign: "center" }}>
                    <div style={{ fontSize: 26 }}>⚠️</div>
                    <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 13, fontWeight: 700, color: C.red }}>Couldn't generate this version</div>
                    <div style={{ fontSize: 12, color: C.muted, maxWidth: 360, lineHeight: 1.6 }}>{genError}</div>
                    <button onClick={handleGenerate} style={{
                      marginTop: 6, padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                      background: "linear-gradient(135deg,#186132,#14D571)", color: "#fff", fontSize: 12, fontWeight: 700,
                      fontFamily: "'Space Grotesk',sans-serif",
                    }}>Try again</button>
                  </div>
                ) : generatedHtml ? (
                  <iframe
                    title="Vision preview"
                    srcDoc={generatedHtml}
                    sandbox="allow-same-origin allow-scripts"
                    style={{ width: "100%", height: 640, border: "none", display: "block" }}
                  />
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 32, textAlign: "center" }}>
                    <div style={{ fontSize: 26 }}>✦</div>
                    <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 13, fontWeight: 700, color: C.navy }}>Ready when you are</div>
                    <div style={{ fontSize: 12, color: C.muted, maxWidth: 320, lineHeight: 1.6 }}>
                      Pick a story direction, adjust the section order and copy, then generate a full rebuild of {domainLabel}.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
