// ─── CONVERSION BLUEPRINT ───────────────────────────────────────────────
// Scoped to the single submitted page (not the site-wide crawl that feeds
// Diagnosis). Current view: the real page with pins on each journey break,
// each opening its fix + AI prompt. Restructured view: pick a story
// direction, edit the suggested per-section changes, generate a real
// self-checked rebuild, deploy it live, roll it back.
//
// Vision Pro's multi-variant live-test UI (traffic split, "add a live test
// variant") used to be nested inside this page's Restructured tab — that's
// been promoted out to its own top-level route (pages/VisionPro.tsx). This
// page still owns the single-rebuild Deploy/Rollback lifecycle per the
// locked spec ("Deploy pushes the rebuild live… Rollback reverts it").
import { useRef, useState, useEffect, type ReactNode, type CSSProperties } from "react";
import { getSupabase } from "../lib/supabase";
import {
  ARCHETYPES, C, DEFAULT_SECTION_ORDER, DEPLOY_VARIANT_ENDPOINT, GENERATION_STEPS, JOURNEY_STAGE_LABELS, ZONE_LABELS,
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

function Pin({ finding, active, onClick, addressed }: { finding: Finding; active: boolean; onClick: () => void; addressed: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: 30, height: 30, borderRadius: "50%",
          background: addressed ? C.emerald : (active ? "#4348D4" : C.violet),
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
          boxShadow: hov || active ? "0 3px 10px rgba(0,0,0,0.22)" : "0 2px 6px rgba(0,0,0,0.13)",
          transition: "all 0.2s",
          transform: active ? "scale(1.18)" : hov ? "scale(1.1)" : "none",
          opacity: addressed ? 0.6 : 1,
        }}>
        <span style={{ fontSize: addressed ? 13 : 11.5, fontWeight: 600, color: "#fff", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1, userSelect: "none" }}>
          {addressed ? "✓" : finding.number}
        </span>
      </div>
      {hov && !active && (
        <div style={{ position: "absolute", bottom: "calc(100% + 7px)", left: "50%", transform: "translateX(-50%)", background: C.navy, color: "#fff", fontSize: 11, lineHeight: 1.5, padding: "6px 10px", borderRadius: 7, whiteSpace: "nowrap", zIndex: 50, pointerEvents: "none", fontFamily: "'Space Grotesk', sans-serif", boxShadow: "0 4px 14px rgba(0,0,0,0.22)", maxWidth: 220, textAlign: "center" }}>
          {finding.title}
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `5px solid ${C.navy}` }} />
        </div>
      )}
    </div>
  );
}

function FixDrawer({ finding, onClose, addressed, onToggleAddressed }: { finding: Finding; onClose: () => void; addressed: boolean; onToggleAddressed: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(finding.aiPrompt); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div style={{
      width: 340, flexShrink: 0,
      background: "rgba(255,255,255,0.55)",
      backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
      borderRadius: 14, border: "1px solid rgba(255,255,255,0.7)",
      boxShadow: "0 8px 36px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
      display: "flex", flexDirection: "column", overflow: "hidden",
      animation: "slideIn 0.18s ease-out",
    }}>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}`}</style>

      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.7)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.violet, marginBottom: 6, fontFamily: "'Space Grotesk', sans-serif" }}>
              {JOURNEY_STAGE_LABELS[finding.journeyStage] ?? finding.journeyStage}
            </div>
            <div style={{ fontSize: 13, fontWeight: 660, color: C.navy, lineHeight: 1.35, fontFamily: "'Unbounded', sans-serif", letterSpacing: "-0.2px" }}>{finding.title}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.dim, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>×</button>
        </div>
      </div>

      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.7)" }}>
        <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 6 }}>What's happening</div>
        <div style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.65, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 10 }}>{finding.whatsHappening}</div>
        <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 6 }}>Fix</div>
        <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, fontFamily: "'Space Grotesk', sans-serif" }}>{finding.fix}</div>
      </div>

      <div style={{ padding: "14px 16px", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, fontFamily: "'Space Grotesk', sans-serif" }}>AI-ready prompt</div>
          <button onClick={finding.aiPrompt ? copy : undefined} title="Copy prompt" style={{
            background: copied ? "linear-gradient(135deg, #186132, #14D571)" : "rgba(255,255,255,0.75)",
            border: copied ? "none" : "1px solid rgba(0,0,0,0.07)", borderRadius: 8, width: 30, height: 30,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: finding.aiPrompt ? "pointer" : "default", transition: "all 0.2s", flexShrink: 0, opacity: finding.aiPrompt ? 1 : 0.4,
          }}>
            {copied
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke={C.muted} strokeWidth="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round"/></svg>}
          </button>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 8, padding: "12px 14px", fontSize: 11.5, lineHeight: 1.7, fontFamily: "'Space Grotesk', sans-serif", color: "#374151", whiteSpace: "pre-wrap" }}>
          {finding.aiPrompt || "AI prompt will be available on your next audit run."}
        </div>
      </div>

      <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.muted, fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", gap: 4 }}>← Back to page</button>
        <button onClick={onToggleAddressed} style={{
          padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700,
          background: addressed ? "linear-gradient(135deg, #186132, #14D571)" : "rgba(91,97,244,0.08)",
          border: addressed ? "none" : "1px solid rgba(91,97,244,0.3)",
          color: addressed ? "#fff" : C.violet, fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.2s",
        }}>{addressed ? "✓ Addressed" : "Mark as addressed"}</button>
      </div>
    </div>
  );
}

const FacSection = ({ children, style = {}, borderBottom = true }: { children: ReactNode; style?: CSSProperties; borderBottom?: boolean }) => (
  <div style={{ padding: "26px 32px", borderBottom: borderBottom ? `1px solid ${C.border}` : "none", position: "relative", ...style }}>
    {children}
  </div>
);
const FacLabel = ({ t }: { t: string }) => (
  <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.1em", color: C.dim, textTransform: "uppercase", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 5 }}>{t}</div>
);
const FacH2 = ({ children }: { children: ReactNode }) => (
  <div style={{ fontSize: 17, fontWeight: 660, color: C.navy, fontFamily: "'Unbounded', sans-serif", letterSpacing: "-0.3px", marginBottom: 8 }}>{children}</div>
);

function PinRow({ zone, activeId, setActiveId, findings, isAddressed }: { zone: string; activeId: string | null; setActiveId: (id: string | null) => void; findings: Finding[]; isAddressed: (id: string) => boolean }) {
  const zf = findings.filter((f) => f.zone === zone);
  if (!zf.length) return null;
  return (
    <>
      {zf.map((f, idx) => (
        <div key={f.id} style={{ position: "absolute", top: 10 + idx * 34, right: `${8 + idx * 2}%`, zIndex: 10 }}>
          <Pin finding={f} active={activeId === f.id} addressed={isAddressed(f.id)} onClick={() => setActiveId(activeId === f.id ? null : f.id)} />
        </div>
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
  const [generating, setGenerating] = useState(false);
  const [genStepIndex, setGenStepIndex] = useState(0);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
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
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 28px" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "4px solid rgba(20,140,89,0.2)", borderTop: `4px solid ${C.emerald}`, animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "8px 28px 8px" }}>
        <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 26, fontWeight: 700, color: C.navy, letterSpacing: "-0.5px", margin: "0 0 4px" }}>
          Conversion{" "}<span style={{ background: "linear-gradient(90deg,#186132,#14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Blueprint</span>
        </h1>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Every journey break pinned to where it really happens — plus a generative rebuild you can preview and deploy live.</p>
      </div>

      {loadError && (
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "16px 28px 0" }}>
          <div style={{ borderRadius: 12, padding: "16px 20px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", fontSize: 13, color: "#991B1B" }}>{loadError}</div>
        </div>
      )}

      {auditData && (
        <>
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "12px 28px 16px", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            {auditData.raw_html && (
              <div style={{ display: "flex", background: "rgba(0,0,0,0.05)", borderRadius: 8, padding: 3, gap: 2 }}>
                {(["current", "restructured"] as const).map((v) => (
                  <button key={v} onClick={() => { setFacView(v); setActiveId(null); }} style={{
                    fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 600, padding: "5px 13px", borderRadius: 6, border: "none", cursor: "pointer", transition: "all 0.18s",
                    background: facView === v ? (v === "restructured" ? "linear-gradient(135deg, #186132, #148C59)" : "#fff") : "transparent",
                    color: facView === v ? (v === "restructured" ? "#fff" : C.navy) : C.muted,
                    boxShadow: facView === v && v === "current" ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                  }}>{v === "current" ? "Current" : "Restructured"}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 28px 12px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
            {isLive && (
              <span style={{ fontSize: 11, fontWeight: 700, color: C.emerald, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.emerald, display: "inline-block" }} /> Live on {realDomain}
              </span>
            )}
            <span style={{ fontSize: 11, color: C.dim }}>
              {facView === "restructured" ? "Pick a story direction, decide what changes, and generate a real rebuild" : `Click a pin to see the fix + AI prompt (${pinFindings.length} journey breaks · ${addressedCount} addressed)`}
            </span>
          </div>

          {facView === "current" ? (
            <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 28px 40px", display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ flex: 1, borderRadius: 16, background: "rgba(255,255,255,0.52)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.7)", boxShadow: "0 8px 40px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)", overflow: "hidden" }}>
                <div style={{ background: "rgba(0,0,0,0.025)", borderBottom: `1px solid ${C.border}`, padding: "7px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", gap: 5 }}>{["#ef4444","#f59e0b","#22c55e"].map((c) => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.45 }} />)}</div>
                  <div style={{ flex: 1, background: "rgba(0,0,0,0.04)", borderRadius: 5, padding: "2px 10px", fontSize: 11, color: C.dim, textAlign: "center" }}>https://{realDomain}</div>
                </div>

                <FacSection style={{ padding: "13px 28px", background: "rgba(255,255,255,0.35)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 14, fontWeight: 700, color: C.navy }}>{realDomain.split(".")[0].charAt(0).toUpperCase() + realDomain.split(".")[0].slice(1)}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                      {(realNavLinks.length > 0 ? realNavLinks.slice(0, 5) : ["Home", "Features", "Pricing", "Blog"]).map((l) => <span key={l} style={{ fontSize: 12, color: C.muted }}>{l}</span>)}
                      <span style={{ fontSize: 12, color: C.muted, padding: "4px 14px", border: `1px solid ${C.border}`, borderRadius: 20 }}>Get Started</span>
                    </div>
                  </div>
                  <PinRow zone="nav" {...pinProps} />
                </FacSection>

                <FacSection style={{ textAlign: "center", padding: "44px 48px 36px", background: "linear-gradient(180deg, rgba(209,250,229,0.1) 0%, transparent 100%)" }}>
                  <div style={{ fontSize: 27, fontWeight: 700, color: C.navy, fontFamily: "'Unbounded', sans-serif", letterSpacing: "-0.5px", lineHeight: 1.25, marginBottom: 12 }}>{realH1}</div>
                  <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 22, maxWidth: 420, margin: "0 auto 22px" }}>{realParagraphs[0] ? realParagraphs[0].slice(0, 120) : "Track, measure, and optimise your product with real-time data."}</div>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <div style={{ padding: "9px 26px", background: "linear-gradient(135deg, #186132, #148C59)", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600 }}>{realCtaTexts[0] || "Get Started"}</div>
                  </div>
                  <PinRow zone="hero" {...pinProps} />
                </FacSection>

                <FacSection>
                  <FacLabel t="Features" />
                  <FacH2>Everything you need to understand your users</FacH2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 11, marginTop: 14 }}>
                    {(realH2Texts.length >= 3 ? realH2Texts.slice(0, 3).map((t) => ({ t, b: "" })) : [
                      { t: "Real-time dashboards", b: "We built our dashboards to give you instant visibility across all your key metrics." },
                      { t: "Custom reports", b: "Our reporting engine lets your team generate any report you need." },
                      { t: "Team collaboration", b: "We designed collaboration features so your whole team stays aligned." },
                    ]).map((c, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.55)", border: `1px solid ${C.border}`, borderRadius: 9, padding: "13px 14px" }}>
                        <div style={{ fontSize: 12.5, fontWeight: 660, color: C.navy, marginBottom: 4 }}>{c.t}</div>
                        {c.b && <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6 }}>{c.b}</div>}
                      </div>
                    ))}
                  </div>
                  <PinRow zone="features" {...pinProps} />
                </FacSection>

                <FacSection style={{ background: "rgba(224,231,255,0.07)" }}>
                  <FacLabel t="Customers" />
                  <FacH2>Trusted by teams at leading companies</FacH2>
                  {realTrustLogoLabels.length > 0 ? (
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14 }}>
                      {realTrustLogoLabels.map((l, i) => <div key={i} style={{ padding: "5px 12px", height: 16, display: "flex", alignItems: "center", background: "rgba(0,0,0,0.06)", borderRadius: 5, fontSize: 10.5, color: C.muted, fontWeight: 600 }}>{l}</div>)}
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14 }}>{[100,80,110,90,70].map((w,i) => <div key={i} style={{ width: w, height: 26, background: "rgba(0,0,0,0.06)", borderRadius: 5 }} />)}</div>
                  )}
                  {realTestimonialTexts.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                      {realTestimonialTexts.slice(0, 3).map((t, i) => (
                        <div key={i} style={{ padding: "10px 13px", background: "rgba(255,255,255,0.55)", border: `1px solid ${C.border}`, borderRadius: 8 }}>
                          <span style={{ fontSize: 11.5, color: C.muted, fontStyle: "italic" }}>&ldquo;{t}&rdquo;</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <PinRow zone="social" {...pinProps} />
                </FacSection>

                <FacSection>
                  <FacLabel t="Pricing" />
                  <FacH2>Simple, transparent pricing</FacH2>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${realPricingTiers.length >= 2 ? realPricingTiers.length : 4},1fr)`, gap: 10, marginTop: 14 }}>
                    {(realPricingTiers.length >= 2 ? realPricingTiers.map((t) => ({ name: t.name, price: t.price, pop: false })) : [
                      { name: "Starter", price: "$0", pop: false }, { name: "Growth", price: "$49", pop: false },
                      { name: "Pro", price: "$99", pop: true }, { name: "Enterprise", price: "Custom", pop: false },
                    ]).map((p, i) => (
                      <div key={i} style={{ background: p.pop ? "rgba(20,140,89,0.06)" : "rgba(255,255,255,0.55)", border: `1px solid ${p.pop ? "rgba(20,140,89,0.2)" : C.border}`, borderRadius: 9, padding: "14px 12px", textAlign: "center" }}>
                        {p.pop && <div style={{ fontSize: 8.5, fontWeight: 600, color: C.emerald, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>Popular</div>}
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: C.navy, marginBottom: 5 }}>{p.name}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, fontFamily: "'Unbounded', sans-serif" }}>{p.price}</div>
                      </div>
                    ))}
                  </div>
                  <PinRow zone="pricing" {...pinProps} />
                </FacSection>

                <FacSection style={{ textAlign: "center", background: "linear-gradient(135deg, rgba(24,97,50,0.04), rgba(91,97,244,0.03))" }}>
                  <FacH2>{realCtaTexts[1] ? realCtaTexts[1] : "Ready to get started?"}</FacH2>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Join thousands of teams already using our platform.</div>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <div style={{ padding: "9px 26px", background: "linear-gradient(135deg, #186132, #148C59)", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600 }}>{realCtaTexts[0] || "Get Started"}</div>
                  </div>
                  <PinRow zone="cta2" {...pinProps} />
                </FacSection>

                <FacSection borderBottom={false} style={{ padding: "14px 28px", background: "rgba(0,0,0,0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: C.dim }}>© 2026 {realDomain}</span>
                    <div style={{ display: "flex", gap: 14 }}>{["Privacy","Terms","Contact"].map((l) => <span key={l} style={{ fontSize: 11, color: C.dim }}>{l}</span>)}</div>
                  </div>
                </FacSection>
              </div>

              <div style={{ position: "sticky", top: 16, width: 340, flexShrink: 0 }}>
                {activeFinding ? (
                  <FixDrawer finding={activeFinding} onClose={() => setActiveId(null)} addressed={isAddressedFn(activeFinding.id)} onToggleAddressed={() => setAddressed((r) => ({ ...r, [activeFinding.id]: !r[activeFinding.id] }))} />
                ) : pinFindings.length === 0 ? (
                  <div style={{ background: "rgba(255,255,255,0.4)", backdropFilter: "blur(24px)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.65)", padding: "36px 24px", textAlign: "center" }}>
                    <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 8 }}>No journey breaks pinned</div>
                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>The diagnosis didn't flag any breaks in the visitor's journey for this run.</div>
                  </div>
                ) : (
                  <div style={{ background: "rgba(255,255,255,0.4)", backdropFilter: "blur(24px)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.65)", padding: "36px 24px", textAlign: "center" }}>
                    <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Click a pin</div>
                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>Each numbered dot marks a real break in the visitor's journey, placed where it happens on the page.</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 28px 40px", display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "flex-start" }}>
              <div style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.7)", boxShadow: "0 8px 32px rgba(0,0,0,0.05)", padding: "18px 18px 20px", position: "sticky", top: 16 }}>
                {journeyBreaks.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.dim, marginBottom: 10 }}>Where the journey breaks down</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                      {sortByJourneyStage(journeyBreaks).map((jb, i) => (
                        <div key={i} style={{ fontSize: 11, lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 700, color: C.violet, textTransform: "uppercase", fontSize: 9, letterSpacing: "0.06em" }}>{JOURNEY_STAGE_LABELS[jb.journeyStage] ?? jb.journeyStage}</span>
                          <div style={{ color: C.muted }}>{jb.reason}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.dim, marginBottom: 10 }}>Story direction</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                  {ARCHETYPES.map((a) => (
                    <button key={a} onClick={() => setArchetype(a)} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: archetype === a ? "linear-gradient(135deg,#186132,#14D571)" : "rgba(0,0,0,0.05)", color: archetype === a ? "#fff" : C.muted, border: "none" }}>{a}</button>
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
                      <div style={{ fontSize: 11, fontWeight: 660, color: C.navy, marginBottom: 4 }}>{ZONE_LABELS[zone] ?? zone}</div>
                      <textarea value={copySelections[zone] ?? ""} onChange={(e) => setCopySelections((c) => ({ ...c, [zone]: e.target.value }))} rows={2} style={{ width: "100%", resize: "vertical", fontSize: 11.5, padding: "7px 9px", borderRadius: 7, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.7)", color: "#374151", lineHeight: 1.5, boxSizing: "border-box" }} />
                    </div>
                  ))}
                </div>

                <button onClick={handleGenerate} disabled={generating} style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none", background: generating ? "rgba(24,97,50,0.4)" : "linear-gradient(135deg,#186132,#14D571)", color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "'Unbounded',sans-serif", cursor: generating ? "default" : "pointer", boxShadow: generating ? "none" : "0 4px 18px rgba(20,140,89,0.3)" }}>
                  {generating ? "Generating…" : generatedHtml ? "Regenerate" : "Generate"}
                </button>
              </div>

              <div>
                {versions.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {versions.map((v) => (
                      <button key={v.id} onClick={() => handleSelectVersion(v)} style={{ padding: "5px 12px", borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: "pointer", background: activeVersionId === v.id ? "rgba(91,97,244,0.14)" : "rgba(255,255,255,0.6)", color: activeVersionId === v.id ? C.violet : C.muted, border: `1px solid ${activeVersionId === v.id ? "rgba(91,97,244,0.35)" : C.border}` }}>v{v.version_number} · {v.archetype}</button>
                    ))}
                  </div>
                )}

                <div style={{ borderRadius: 14, overflow: "hidden", background: "#fff", border: "1px solid rgba(255,255,255,0.7)", boxShadow: "0 8px 32px rgba(0,0,0,0.06)", minHeight: 520, display: "flex", flexDirection: "column" }}>
                  <div style={{ background: "rgba(0,0,0,0.03)", borderBottom: `1px solid ${C.border}`, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", gap: 5 }}>{["#ef4444", "#f59e0b", "#22c55e"].map((c) => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.45 }} />)}</div>
                    <div style={{ flex: 1, background: "rgba(0,0,0,0.04)", borderRadius: 5, padding: "3px 10px", fontSize: 11, color: C.dim, textAlign: "center" }}>https://{realDomain}</div>
                    {generatedHtml && !generating && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={handleSaveVersion} style={{ padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", background: "rgba(20,140,89,0.12)", color: C.emerald, fontSize: 11, fontWeight: 700 }}>Save version</button>
                        {isLive ? (
                          <button onClick={handleRollback} style={{ padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", background: "rgba(220,38,38,0.1)", color: "#DC2626", fontSize: 11, fontWeight: 700 }}>Rollback</button>
                        ) : (
                          <button onClick={handleDeploy} disabled={deploying} style={{ padding: "5px 12px", borderRadius: 7, border: "none", cursor: deploying ? "default" : "pointer", background: deploying ? "rgba(91,97,244,0.3)" : C.violet, color: "#fff", fontSize: 11, fontWeight: 700 }}>{deploying ? "Deploying…" : "Deploy"}</button>
                        )}
                      </div>
                    )}
                  </div>

                  {deployError && <div style={{ padding: "8px 16px", background: "rgba(220,38,38,0.06)", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: "#DC2626" }}>{deployError}</div>}

                  <div style={{ flex: 1, position: "relative" }}>
                    {generating ? (
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(20,140,89,0.15)", borderTopColor: C.emerald, animation: "spin 0.8s linear infinite" }} />
                        <div style={{ fontSize: 13, color: C.navy, fontWeight: 600 }}>{GENERATION_STEPS[genStepIndex]}</div>
                      </div>
                    ) : genError ? (
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 32, textAlign: "center" }}>
                        <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 13, fontWeight: 700, color: "#DC2626" }}>Couldn't generate this version</div>
                        <div style={{ fontSize: 12, color: C.muted, maxWidth: 360, lineHeight: 1.6 }}>{genError}</div>
                        <button onClick={handleGenerate} style={{ marginTop: 6, padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#186132,#14D571)", color: "#fff", fontSize: 12, fontWeight: 700 }}>Try again</button>
                      </div>
                    ) : generatedHtml ? (
                      <iframe title="Vision preview" srcDoc={generatedHtml} sandbox="allow-same-origin allow-scripts" style={{ width: "100%", height: 640, border: "none", display: "block" }} />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 32, textAlign: "center" }}>
                        <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 13, fontWeight: 700, color: C.navy }}>Ready when you are</div>
                        <div style={{ fontSize: 12, color: C.muted, maxWidth: 320, lineHeight: 1.6 }}>Pick a story direction, adjust the section order and copy, then generate a full rebuild of {realDomain}.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
