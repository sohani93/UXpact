// ─── CONVERSION BLUEPRINT ───────────────────────────────────────────────
// Scoped to the single submitted page (not the site-wide crawl that feeds
// Diagnosis). Current view: the real page (in its own light theme, per the
// mockup's "facsimile always renders in the source site's own light theme"
// rule) with pins on each real journey break, each opening its fix + AI
// prompt in the dark drawer. Restructured view: pick a story direction,
// edit the suggested per-section changes on a draggable/contenteditable
// canvas, generate a real self-checked rebuild, deploy it live, roll it
// back — all real handlers from the prior pass, restyled to the mockup's
// .panel-head/.toggle-switch/.bp-grid/.facsimile/.drawer/.canvas-toolbar/
// .e-section markup.
import { useRef, useState, useEffect, type ReactNode, type CSSProperties, type DragEvent } from "react";
import { getSupabase } from "../lib/supabase";
import {
  ARCHETYPES, DEFAULT_SECTION_ORDER, DEPLOY_VARIANT_ENDPOINT, GENERATION_STEPS, JOURNEY_STAGE_LABELS, ZONE_LABELS,
  generateAndSelfCheck, mapJourneyRows, seedCopySelectionsFromJourney, sortByJourneyStage, zoneForJourneyBreak,
} from "../lib/workspace-shared";
import type { JourneyBreak } from "../lib/ui-types";

type AuditRow = {
  id: string;
  domain: string;
  dom_data: any;
  raw_html: string | null;
  target_archetype: string | null;
};

type Finding = {
  id: string;
  number: number;
  zone: string;
  journeyStage: string;
  title: string;
  whatsHappening: string;
  fix: string;
  aiPrompt: string;
};

function Pin({ finding, active, addressed, style, onClick }: { finding: Finding; active: boolean; addressed: boolean; style: CSSProperties; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ position: "absolute", ...style, zIndex: 10 }}>
      <div className={`pin${active ? " active" : ""}${addressed ? " addressed" : ""}`} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
        {addressed ? "✓" : finding.number}
      </div>
      {hov && !active && (
        <div style={{ position: "absolute", bottom: "calc(100% + 7px)", left: "50%", transform: "translateX(-50%)", background: "#16181D", color: "#fff", fontSize: 11, lineHeight: 1.5, padding: "6px 10px", borderRadius: 7, whiteSpace: "nowrap", zIndex: 50, pointerEvents: "none", fontFamily: "'Space Grotesk', sans-serif", boxShadow: "0 4px 14px rgba(0,0,0,0.3)", maxWidth: 220, textAlign: "center" }}>
          {finding.title}
        </div>
      )}
    </div>
  );
}

function FixDrawer({ finding, addressed, onToggleAddressed }: { finding: Finding; addressed: boolean; onToggleAddressed: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(finding.aiPrompt); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div className="drawer">
      <span className="tag">{JOURNEY_STAGE_LABELS[finding.journeyStage] ?? finding.journeyStage}</span>
      <h4>{finding.title}</h4>
      <p>{finding.whatsHappening}</p>
      {finding.fix && <p><b style={{ color: "#fff" }}>Fix: </b>{finding.fix}</p>}
      <div className="prompt">{finding.aiPrompt || "AI prompt will be available on your next audit run."}</div>
      <div className="drawer-actions">
        <button className="drawer-btn" onClick={finding.aiPrompt ? copy : undefined} disabled={!finding.aiPrompt}>{copied ? "Copied" : "Copy prompt"}</button>
        <button className={`drawer-btn${addressed ? " on" : ""}`} onClick={onToggleAddressed}>{addressed ? "✓ Addressed" : "Mark as addressed"}</button>
      </div>
    </div>
  );
}

const FacSection = ({ children, className = "", style = {} }: { children: ReactNode; className?: string; style?: CSSProperties }) => (
  <div className={`fac-sect ${className}`} style={style}>{children}</div>
);

function PinRow({ zone, activeId, setActiveId, findings, isAddressed }: { zone: string; activeId: string | null; setActiveId: (id: string | null) => void; findings: Finding[]; isAddressed: (id: string) => boolean }) {
  const zf = findings.filter((f) => f.zone === zone);
  if (!zf.length) return null;
  return (
    <>
      {zf.map((f, idx) => (
        <Pin key={f.id} finding={f} active={activeId === f.id} addressed={isAddressed(f.id)} style={{ top: 10 + idx * 34, right: `${8 + idx * 2}%` }} onClick={() => setActiveId(activeId === f.id ? null : f.id)} />
      ))}
    </>
  );
}

export default function Blueprint({ auditId }: { auditId: string }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<AuditRow | null>(null);
  const [journeyBreaks, setJourneyBreaks] = useState<JourneyBreak[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(false);

  const [facView, setFacView] = useState<"current" | "restructured">("current");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addressed, setAddressed] = useState<Record<string, boolean>>({});

  const [archetype, setArchetype] = useState<string>("");
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [copySelections, setCopySelections] = useState<Record<string, string>>({});
  const [draggedZone, setDraggedZone] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genStepIndex, setGenStepIndex] = useState(0);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [generatedArchetype, setGeneratedArchetype] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const stepTimerRef = useRef<number | null>(null);

  const refreshIsLive = async () => {
    const supabase = getSupabase();
    const { data } = await supabase.from("deployed_variants").select("id").eq("audit_id", auditId).eq("is_active", true);
    setIsLive((data ?? []).length > 0);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const supabase = getSupabase();
        const [{ data: auditRows, error: auditErr }, { data: journeyRows }, { data: versionRows }] = await Promise.all([
          supabase.from("audits").select("id, domain, dom_data, raw_html, target_archetype").eq("id", auditId),
          supabase.from("archetype_consistency_scores").select("*").eq("audit_id", auditId),
          supabase.from("vision_versions").select("*").eq("audit_id", auditId).order("version_number", { ascending: true }),
        ]);
        await refreshIsLive();
        if (cancelled) return;
        if (auditErr) throw new Error(auditErr.message);
        const row = auditRows?.[0] ?? null;
        if (!row) throw new Error("This audit couldn't be found.");
        setAuditData(row);
        const mapped = mapJourneyRows(journeyRows);
        setJourneyBreaks(mapped);
        setVersions(versionRows ?? []);
        setArchetype(row.target_archetype || "Hero");
        setCopySelections(seedCopySelectionsFromJourney(mapped));
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load this workspace.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId]);

  const domData = auditData?.dom_data ?? null;
  const realH1 = domData?.h1Text || auditData?.domain || "yoursite.com";
  const realNavLinks: string[] = domData?.navLinks ?? [];
  const realCtaTexts: string[] = domData?.ctaTexts ?? [];
  const realH2Texts: string[] = domData?.h2Texts ?? [];
  const realParagraphs: string[] = domData?.paragraphTexts ?? [];
  const realTestimonialTexts: string[] = domData?.testimonialTexts ?? [];
  const realTrustLogoLabels: string[] = domData?.trustLogoLabels ?? [];
  const realPricingTiers: { name: string; price: string }[] = domData?.pricingTiers ?? [];
  const realDomain = auditData?.domain || "yoursite.com";

  const pinFindings: Finding[] = journeyBreaks.map((jb, i) => ({
    id: `jb-${i}`,
    number: i + 1,
    zone: zoneForJourneyBreak(jb),
    journeyStage: jb.journeyStage,
    title: jb.element || "Journey break",
    whatsHappening: jb.whatsHappening,
    fix: jb.fix,
    aiPrompt: jb.aiPrompt,
  }));

  const activeFinding = pinFindings.find((f) => f.id === activeId) || null;
  const addressedCount = Object.values(addressed).filter(Boolean).length;
  const isAddressedFn = (id: string) => addressed[id] ?? false;
  const pinProps = { activeId, setActiveId, findings: pinFindings, isAddressed: isAddressedFn };

  const onSectionDragOver = (e: DragEvent, overZone: string) => {
    e.preventDefault();
    if (!draggedZone || draggedZone === overZone) return;
    setSectionOrder((order) => {
      const from = order.indexOf(draggedZone);
      const to = order.indexOf(overZone);
      if (from === -1 || to === -1) return order;
      const next = [...order];
      next.splice(from, 1);
      next.splice(to, 0, draggedZone);
      return next;
    });
  };

  const startStagedSteps = () => {
    setGenStepIndex(0);
    let i = 0;
    stepTimerRef.current = window.setInterval(() => { i = Math.min(i + 1, GENERATION_STEPS.length - 1); setGenStepIndex(i); }, 1400);
  };
  const stopStagedSteps = () => { if (stepTimerRef.current) { window.clearInterval(stepTimerRef.current); stepTimerRef.current = null; } };

  const handleGenerate = async () => {
    if (!auditData?.raw_html) return;
    setGenerating(true);
    setGenError(null);
    startStagedSteps();
    try {
      const result = await generateAndSelfCheck({ auditId, archetype, sectionOrder, copySelections, rawHtml: auditData.raw_html });
      if ("error" in result) { setGenError(result.error); setGeneratedHtml(null); return; }
      setGeneratedHtml(result.html);
      setGeneratedArchetype(archetype);
      setActiveVersionId(null);
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
    const { data, error } = await supabase.from("vision_versions").insert({ audit_id: auditId, version_number: nextVersionNumber, archetype, section_order: sectionOrder, copy_selections: copySelections, html: generatedHtml }).select("*").single();
    if (!error && data) { setVersions((v) => [...v, data]); setActiveVersionId(data.id); }
  };

  const handleSelectVersion = (v: any) => {
    setGeneratedHtml(v.html);
    setGeneratedArchetype(v.archetype || null);
    setActiveVersionId(v.id);
    setGenError(null);
    setArchetype(v.archetype || archetype);
    if (Array.isArray(v.section_order) && v.section_order.length) setSectionOrder(v.section_order);
    if (v.copy_selections && typeof v.copy_selections === "object") setCopySelections(v.copy_selections);
  };

  const handleDeploy = async () => {
    if (!generatedHtml || !auditData?.raw_html) return;
    setDeploying(true);
    setDeployError(null);
    try {
      const response = await fetch(DEPLOY_VARIANT_ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId, domain: auditData.domain, generatedHtml, rawHtml: auditData.raw_html, zones: sectionOrder }),
      });
      const json = await response.json();
      if (!response.ok || json.error) setDeployError(json.message || "Deploy failed. Try again.");
      else await refreshIsLive();
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : "Couldn't reach the deploy service.");
    } finally {
      setDeploying(false);
    }
  };

  const handleRollback = async () => {
    const supabase = getSupabase();
    await supabase.from("deployed_variants").update({ is_active: false }).eq("audit_id", auditId).eq("is_active", true);
    await refreshIsLive();
    setDeployError(null);
  };

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><div className="ws-spinner" /></div>;
  }

  if (loadError || !auditData) {
    return <div className="ws-error">{loadError ?? "This audit couldn't be found."}</div>;
  }

  return (
    <>
      <div className="panel-head">
        <div>
          <h2>Conversion <span className="grad-text">Blueprint</span></h2>
          <p>{facView === "current" ? "Every break, pinned to where it actually happens." : "Pick a direction, then edit and rearrange it directly."}</p>
        </div>
        {auditData.raw_html && (
          <button className={`toggle-switch${facView === "restructured" ? " on" : ""}`} onClick={() => { setFacView((v) => (v === "current" ? "restructured" : "current")); setActiveId(null); }}>
            <span className={`ts-label${facView === "current" ? " on" : ""}`}>Current</span>
            <span className="ts-track"><span className="ts-thumb" /></span>
            <span className={`ts-label${facView === "restructured" ? " on" : ""}`}>Restructured</span>
          </button>
        )}
      </div>

      {deployError && <div className="ws-error" style={{ marginBottom: 16 }}>{deployError}</div>}

      {isLive && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, fontSize: 11.5, fontWeight: 700, color: "var(--mint)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--mint)", display: "inline-block" }} /> Live on {realDomain}
        </div>
      )}

      <div className={`bp-view${facView === "current" ? " on" : ""}`}>
        <div className="bp-grid">
          <div className="facsimile">
            <div className="fac-bar"><div className="fac-dot" /><div className="fac-dot" /><div className="fac-dot" /><div className="fac-url">https://{realDomain}</div></div>
            <div className="fac-nav">
              <span className="b">{realDomain.split(".")[0]}</span>
              <div className="links">{(realNavLinks.length > 0 ? realNavLinks.slice(0, 4) : ["Product", "Pricing", "Customers", "Docs"]).map((l) => <span key={l}>{l}</span>)}</div>
            </div>

            <div className="fac-hero" style={{ position: "relative" }}>
              <h3>{realH1}</h3>
              <p>{realParagraphs[0] ? realParagraphs[0].slice(0, 160) : "Track, measure, and optimise your product with real-time data."}</p>
              <span className="fac-cta">{realCtaTexts[0] || "Get Started"}</span>
              <PinRow zone="hero" {...pinProps} />
            </div>

            <FacSection>
              <div className="fac-sect-label">Features</div>
              <div className="fac-row">
                {(realH2Texts.length >= 3 ? realH2Texts.slice(0, 3) : ["Real-time dashboards", "Custom reports", "Team collaboration"]).map((t) => (
                  <div key={t} className="fac-tile">{t}</div>
                ))}
              </div>
              <PinRow zone="features" {...pinProps} />
            </FacSection>

            <FacSection>
              <div className="fac-sect-label">Customers</div>
              {realTrustLogoLabels.length > 0 && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                  {realTrustLogoLabels.map((l, i) => <div key={i} style={{ padding: "4px 10px", background: "#F7F7F7", borderRadius: 5, fontSize: 10.5, color: "#666", fontWeight: 600 }}>{l}</div>)}
                </div>
              )}
              {realTestimonialTexts.length > 0 ? realTestimonialTexts.slice(0, 2).map((t, i) => (
                <div key={i} style={{ fontSize: 12.5, color: "#555" }}><span className="fac-avatar" />&ldquo;{t}&rdquo;</div>
              )) : (
                <div style={{ fontSize: 12.5, color: "#555" }}><span className="fac-avatar" />No testimonials found on this page.</div>
              )}
              <PinRow zone="social" {...pinProps} />
            </FacSection>

            <FacSection>
              <div className="fac-sect-label">Pricing</div>
              <div className="fac-row" style={{ gridTemplateColumns: `repeat(${Math.max(realPricingTiers.length, 3)},1fr)` }}>
                {(realPricingTiers.length >= 2 ? realPricingTiers : [{ name: "Starter", price: "$19/mo" }, { name: "Team", price: "$49/mo" }, { name: "Scale", price: "$129/mo" }]).map((p, i) => (
                  <div key={i} className="fac-tile">{p.name} — {p.price}</div>
                ))}
              </div>
              <PinRow zone="pricing" {...pinProps} />
            </FacSection>

            <FacSection style={{ textAlign: "center" }}>
              <h4 style={{ margin: "0 0 10px", fontFamily: "'Unbounded',sans-serif", fontSize: 15, color: "#16181D" }}>{realCtaTexts[1] || "Ready to get started?"}</h4>
              <span className="fac-cta">{realCtaTexts[0] || "Get Started"}</span>
              <PinRow zone="cta2" {...pinProps} />
            </FacSection>

            <div className="fac-footer">© {realDomain}</div>
          </div>

          {activeFinding ? (
            <FixDrawer finding={activeFinding} addressed={isAddressedFn(activeFinding.id)} onToggleAddressed={() => setAddressed((r) => ({ ...r, [activeFinding.id]: !r[activeFinding.id] }))} />
          ) : (
            <div className="ws-empty">
              <div className="t">{pinFindings.length === 0 ? "No journey breaks pinned" : "Click a pin"}</div>
              <div className="d">
                {pinFindings.length === 0
                  ? "The diagnosis didn't flag any breaks in the visitor's journey for this run."
                  : `Each numbered dot marks a real break in the visitor's journey (${pinFindings.length} total · ${addressedCount} addressed).`}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`bp-view${facView === "restructured" ? " on" : ""}`}>
        <div className="canvas-toolbar">
          <span className="wb-label">Direction</span>
          <div className="chip-group">
            {ARCHETYPES.map((a) => (
              <button key={a} type="button" className={`chip${archetype === a ? " on" : ""}`} onClick={() => setArchetype(a)}>{a}</button>
            ))}
          </div>
          <span className="canvas-hint">Drag <span className="hg">⠿</span> to reorder · click any block to edit what changes</span>
          <button className="gen-btn" style={{ marginLeft: "auto" }} disabled={generating} onClick={handleGenerate}>
            {generating ? "Generating…" : generatedHtml ? "Regenerate" : "Generate"}
          </button>
        </div>

        {!generatedHtml && !generating && !genError && (
          <div className="canvas-hint" style={{ marginBottom: 14 }}>
            This is your editing canvas, not the rebuilt page — the blocks below are instructions for the rebuild, not final copy. Click Generate to build the real page. Full-page rebuilds work best on smaller pages; very large real-world sites may not finish in time.
          </div>
        )}

        {generatedHtml && generatedArchetype && archetype !== generatedArchetype && (
          <div className="canvas-hint" style={{ marginTop: -8, marginBottom: 14, color: "var(--violet)" }}>
            You picked {archetype} — the preview below is still {generatedArchetype}. Click Regenerate to rebuild it for {archetype}.
          </div>
        )}

        {genError && (
          <div className="ws-error" style={{ marginBottom: 16 }}>
            {genError} <button className="drawer-btn" style={{ marginLeft: 10 }} onClick={handleGenerate}>Try again</button>
          </div>
        )}

        {journeyBreaks.length > 0 && (
          <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 10 }}>
            {sortByJourneyStage(journeyBreaks).map((jb, i) => (
              <span key={i} className="status-pill" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                <b style={{ color: "var(--violet)" }}>{JOURNEY_STAGE_LABELS[jb.journeyStage] ?? jb.journeyStage}</b>
              </span>
            ))}
          </div>
        )}

        <div className="facsimile">
          <div className="fac-bar"><div className="fac-dot" /><div className="fac-dot" /><div className="fac-dot" /><div className="fac-url">https://{realDomain} — restructured</div></div>
          <div className="fac-nav">
            <span className="b">{realDomain.split(".")[0]}</span>
            <div className="links">{(realNavLinks.length > 0 ? realNavLinks.slice(0, 4) : ["Product", "Pricing", "Customers", "Docs"]).map((l) => <span key={l}>{l}</span>)}</div>
          </div>

          {sectionOrder.map((zone) => (
            <div
              key={zone}
              className={`e-section${draggedZone === zone ? " dragging" : ""}`}
              onDragOver={(e) => onSectionDragOver(e, zone)}
            >
              <span className="e-handle" draggable onDragStart={() => setDraggedZone(zone)} onDragEnd={() => setDraggedZone(null)}>⠿</span>
              <div className="e-body fac-sect">
                <div className="fac-sect-label">{ZONE_LABELS[zone] ?? zone}</div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  style={{ fontSize: 12.5, lineHeight: 1.6, color: "#374151" }}
                  onBlur={(e) => setCopySelections((c) => ({ ...c, [zone]: e.currentTarget.textContent || "" }))}
                >
                  {copySelections[zone] ?? "Describe what should change in this section."}
                </div>
                <div className="edit-hint">Sent to the rebuild as an instruction — not final copy.</div>
              </div>
            </div>
          ))}

          <div className="fac-footer">© {realDomain}</div>
        </div>

        {generating && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 0" }}>
            <div className="ws-spinner" style={{ width: 24, height: 24 }} />
            <span style={{ fontSize: 13, color: "#fff" }}>{GENERATION_STEPS[genStepIndex]}</span>
          </div>
        )}

        {generatedHtml && !generating && (
          <div style={{ marginTop: 16 }}>
            {versions.length > 0 && (
              <div className="chip-group" style={{ marginBottom: 10 }}>
                {versions.map((v) => (
                  <button key={v.id} type="button" className={`chip${activeVersionId === v.id ? " on" : ""}`} onClick={() => handleSelectVersion(v)}>v{v.version_number} · {v.archetype}</button>
                ))}
              </div>
            )}
            <div className="facsimile" style={{ background: "#fff" }}>
              <div className="fac-bar">
                <div className="fac-dot" /><div className="fac-dot" /><div className="fac-dot" />
                <div className="fac-url">Preview</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="drawer-btn" onClick={handleSaveVersion}>Save version</button>
                  {isLive ? (
                    <button className="drawer-btn" style={{ color: "var(--danger)" }} onClick={handleRollback}>Rollback</button>
                  ) : (
                    <button className="gen-btn" style={{ padding: "6px 14px", fontSize: 11 }} disabled={deploying} onClick={handleDeploy}>{deploying ? "Deploying…" : "Deploy this version"}</button>
                  )}
                </div>
              </div>
              <iframe title="Vision preview" srcDoc={generatedHtml} sandbox="allow-same-origin allow-scripts" style={{ width: "100%", height: 560, border: "none", display: "block" }} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
