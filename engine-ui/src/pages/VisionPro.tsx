// ─── VISION PRO ─────────────────────────────────────────────────────────
// Its own top-level destination — not nested inside Blueprint. Once a
// version is live (deployed from Blueprint), Vision Pro lets the user add a
// second (or further) version to run alongside it; real visitors are split
// across active versions weighted toward whichever converts better. Shows
// each active version's real traffic share, times shown, and conversions —
// all read straight from deployed_variants + variant_events per
// docs/contracts/VisionProVariant.md.
import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";
import { ARCHETYPES, DEFAULT_SECTION_ORDER, DEPLOY_VARIANT_ENDPOINT, generateAndSelfCheck, mapJourneyRows, seedCopySelectionsFromJourney } from "../lib/workspace-shared";

type AuditRow = { id: string; domain: string; raw_html: string | null; target_archetype: string | null };
type ActiveVariant = { id: string; traffic_weight: number | null; deployed_at: string };

export default function VisionPro({ auditId }: { auditId: string }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<AuditRow | null>(null);
  const [copySelections, setCopySelections] = useState<Record<string, string>>({});

  const [activeVariants, setActiveVariants] = useState<ActiveVariant[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, { serves: number; converts: number }>>({});
  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  const [archetype, setArchetype] = useState<string>("");
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [addingLiveTest, setAddingLiveTest] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const refreshActiveVariants = async () => {
    const supabase = getSupabase();
    const { data: activeRows } = await supabase.from("deployed_variants").select("id, traffic_weight, deployed_at").eq("audit_id", auditId).eq("is_active", true).order("deployed_at", { ascending: true });
    const rows = activeRows ?? [];
    setActiveVariants(rows);
    if (rows.length === 0) { setEventCounts({}); return; }
    const ids = rows.map((v) => v.id);
    const { data: eventRows } = await supabase.from("variant_events").select("deployed_variant_id, event_type").in("deployed_variant_id", ids);
    const counts: Record<string, { serves: number; converts: number }> = {};
    ids.forEach((id) => { counts[id] = { serves: 0, converts: 0 }; });
    (eventRows ?? []).forEach((ev: any) => {
      const entry = counts[ev.deployed_variant_id];
      if (!entry) return;
      if (ev.event_type === "serve") entry.serves += 1; else if (ev.event_type === "convert") entry.converts += 1;
    });
    setEventCounts(counts);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const supabase = getSupabase();
        const [{ data: auditRows, error: auditErr }, { data: journeyRows }] = await Promise.all([
          supabase.from("audits").select("id, domain, raw_html, target_archetype").eq("id", auditId),
          supabase.from("archetype_consistency_scores").select("*").eq("audit_id", auditId),
        ]);
        await refreshActiveVariants();
        if (cancelled) return;
        if (auditErr) throw new Error(auditErr.message);
        const row = auditRows?.[0] ?? null;
        if (!row) throw new Error("This audit couldn't be found.");
        setAuditData(row);
        setArchetype(row.target_archetype || "Hero");
        setCopySelections(seedCopySelectionsFromJourney(mapJourneyRows(journeyRows)));
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load Vision Pro.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId]);

  const isLive = activeVariants.length > 0;

  const handleGenerateVariant = async () => {
    if (!auditData?.raw_html) return;
    setGenerating(true);
    setGenError(null);
    setGeneratedHtml(null);
    try {
      const result = await generateAndSelfCheck({ auditId, archetype, sectionOrder: DEFAULT_SECTION_ORDER, copySelections, rawHtml: auditData.raw_html });
      if ("error" in result) { setGenError(result.error); return; }
      setGeneratedHtml(result.html);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Couldn't reach the Vision service.");
    } finally {
      setGenerating(false);
    }
  };

  const handleAddLiveTestVariant = async () => {
    if (!generatedHtml || !auditData?.raw_html) return;
    setAddingLiveTest(true);
    setAddError(null);
    try {
      const response = await fetch(DEPLOY_VARIANT_ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId, domain: auditData.domain, generatedHtml, rawHtml: auditData.raw_html, zones: DEFAULT_SECTION_ORDER, multiArmed: true }),
      });
      const json = await response.json();
      if (!response.ok || json.error) setAddError(json.message || "Couldn't add this as a live test variant. Try again.");
      else { setGeneratedHtml(null); setShowAddPanel(false); await refreshActiveVariants(); }
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Couldn't reach the deploy service.");
    } finally {
      setAddingLiveTest(false);
    }
  };

  const handleRollbackVariant = async (variantId: string) => {
    setRollingBackId(variantId);
    setRollbackError(null);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("deployed_variants").update({ is_active: false }).eq("id", variantId);
      if (error) throw new Error(error.message);
      await refreshActiveVariants();
    } catch (err) {
      setRollbackError(err instanceof Error ? err.message : "Couldn't roll back this version.");
    } finally {
      setRollingBackId(null);
    }
  };

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><div className="ws-spinner" /></div>;
  }

  return (
    <>
      <h2>Vision <span className="grad-text">Pro</span></h2>
      <p className="vp-sub">Real visitors, split live across every version you've deployed — weight shifts automatically toward whichever one actually converts.</p>

      {loadError && <div className="ws-error" style={{ marginBottom: 16 }}>{loadError}</div>}
      {rollbackError && <div className="ws-error" style={{ marginBottom: 16 }}>{rollbackError}</div>}

      {!isLive ? (
        <>
          {/* Cosmetic placeholder — same shape the real weight bar takes once
              a variant is live, muted so it reads as "not yet" not as data. */}
          <div className="vp-bar" style={{ opacity: 0.35 }}>
            <div className="vp-seg" style={{ width: "100%", background: "rgba(255,255,255,0.08)" }} />
          </div>
          <div className="ws-empty">
            <div className="t">Nothing live yet</div>
            <div className="d">Deploy a rebuild from Conversion Blueprint first. Once one version is live, come back here to add a second (or further) version to test alongside it.</div>
          </div>
        </>
      ) : (
        <>
          <div className="vp-bar">
            {activeVariants.map((v, i) => {
              const weightPct = Math.round((v.traffic_weight ?? 1 / activeVariants.length) * 100);
              return (
                <div
                  key={v.id}
                  className={`vp-seg${i > 0 ? " v2" : ""}`}
                  style={{ width: `${weightPct}%`, background: i === 0 ? "linear-gradient(100deg,var(--mint),#8fe6b8)" : "var(--violet-deep)" }}
                >
                  <span className="nm">Version {i + 1}</span>
                  <span className="pct">{weightPct}%</span>
                </div>
              );
            })}
          </div>

          <div className="vp-rows">
            {activeVariants.map((v, i) => {
              const counts = eventCounts[v.id] ?? { serves: 0, converts: 0 };
              const rate = counts.serves > 0 ? ((counts.converts / counts.serves) * 100).toFixed(1) : "0.0";
              const deployedLabel = new Date(v.deployed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
              return (
                <div className="vp-row" key={v.id}>
                  <div className="vp-row-main">
                    <b>Version {i + 1}</b>
                    <span className="vp-row-stat">{counts.serves} served · {counts.converts} converted · {rate}% · deployed {deployedLabel}</span>
                  </div>
                  <div className="vp-row-actions">
                    <button className="vp-btn" onClick={() => setDetailFor(detailFor === v.id ? null : v.id)}>{detailFor === v.id ? "Hide detail" : "View detail"}</button>
                    {activeVariants.length > 1 && (
                      <button className="vp-btn danger" disabled={rollingBackId === v.id} onClick={() => handleRollbackVariant(v.id)}>
                        {rollingBackId === v.id ? "Rolling back…" : "Roll back"}
                      </button>
                    )}
                  </div>
                  {detailFor === v.id && (
                    <div className="vp-detail">id: {v.id} · traffic_weight: {v.traffic_weight ?? "—"} · deployed_at: {v.deployed_at}</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {isLive && auditData?.raw_html && !showAddPanel && (
        <button className="gen-btn" style={{ marginTop: 16 }} onClick={() => setShowAddPanel(true)}>+ Add another version to this test</button>
      )}

      {isLive && auditData?.raw_html && showAddPanel && (
        <div style={{ marginTop: 20, background: "var(--surface)", borderRadius: 16, padding: "22px 24px" }}>
          <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Add a live test variant</div>
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 16, lineHeight: 1.6 }}>Generate another story direction and run it alongside what's live now — traffic is split and weighted automatically as real visits and conversions come in.</p>

          <div className="wb-label" style={{ marginBottom: 8 }}>Story direction</div>
          <div className="chip-group" style={{ marginBottom: 16 }}>
            {ARCHETYPES.map((a) => (
              <button key={a} type="button" className={`chip${archetype === a ? " on" : ""}`} onClick={() => setArchetype(a)}>{a}</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button className="gen-btn" disabled={generating} onClick={handleGenerateVariant}>{generating ? "Generating…" : generatedHtml ? "Regenerate" : "Generate"}</button>
            {generatedHtml && (
              <button className="gen-btn ghost" disabled={addingLiveTest} onClick={handleAddLiveTestVariant}>{addingLiveTest ? "Adding…" : "Add as live test variant"}</button>
            )}
          </div>

          {genError && <div className="ws-error" style={{ marginBottom: 10 }}>{genError}</div>}
          {addError && <div className="ws-error" style={{ marginBottom: 10 }}>{addError}</div>}

          {generating && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 0" }}>
              <div className="ws-spinner" style={{ width: 20, height: 20 }} />
              <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Generating and self-checking the rebuild…</span>
            </div>
          )}

          {generatedHtml && !generating && (
            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)", marginTop: 6 }}>
              <iframe title="Vision Pro variant preview" srcDoc={generatedHtml} sandbox="allow-same-origin allow-scripts" style={{ width: "100%", height: 420, border: "none", display: "block" }} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
