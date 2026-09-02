// ─── VISION PRO ─────────────────────────────────────────────────────────
// Its own top-level destination — not nested inside Blueprint. Once a
// version is live (deployed from Blueprint), Vision Pro lets the user add a
// second (or further) version to run alongside it; real visitors are split
// across active versions weighted toward whichever converts better. Shows
// each active version's real traffic share, times shown, and conversions.
import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";
import {
  ARCHETYPES, C, DEFAULT_SECTION_ORDER, DEPLOY_VARIANT_ENDPOINT, glass,
  generateAndSelfCheck, mapJourneyRows, seedCopySelectionsFromJourney,
} from "../lib/workspace-shared";

type AuditRow = { id: string; domain: string; raw_html: string | null; target_archetype: string | null };
type ActiveVariant = { id: string; traffic_weight: number | null; deployed_at: string };

export default function VisionPro({ auditId }: { auditId: string }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<AuditRow | null>(null);
  const [copySelections, setCopySelections] = useState<Record<string, string>>({});

  const [activeVariants, setActiveVariants] = useState<ActiveVariant[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, { serves: number; converts: number }>>({});

  const [archetype, setArchetype] = useState<string>("");
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
      else { setGeneratedHtml(null); await refreshActiveVariants(); }
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Couldn't reach the deploy service.");
    } finally {
      setAddingLiveTest(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 28px" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "4px solid rgba(20,140,89,0.2)", borderTop: `4px solid ${C.emerald}`, animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "8px 28px 40px" }}>
      <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 26, fontWeight: 700, color: C.navy, letterSpacing: "-0.5px", margin: "0 0 4px" }}>
        Vision{" "}<span style={{ background: "linear-gradient(90deg,#186132,#14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Pro</span>
      </h1>
      <p style={{ fontSize: 14, color: C.muted, margin: "0 0 20px" }}>Run more than one version live at once — real visitors split across them, weighted toward whichever actually converts.</p>

      {loadError && (
        <div style={{ borderRadius: 12, padding: "16px 20px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", fontSize: 13, color: "#991B1B", marginBottom: 16 }}>{loadError}</div>
      )}

      <div style={{ ...glass, borderRadius: 16, padding: "24px 28px", marginBottom: 16 }}>
        {!isLive ? (
          <div>
            <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Nothing live yet</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
              Deploy a rebuild from Conversion Blueprint first. Once one version is live, come back here to add a second (or further) version to test alongside it.
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.dim, marginBottom: 12 }}>
              Live traffic split{activeVariants.length > 1 ? ` — ${activeVariants.length} versions` : ""}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeVariants.map((v, i) => {
                const counts = eventCounts[v.id] ?? { serves: 0, converts: 0 };
                const weightPct = Math.round((v.traffic_weight ?? 1 / activeVariants.length) * 100);
                return (
                  <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.6)", border: `1px solid ${C.border}` }}>
                    <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 12.5, fontWeight: 700, color: C.navy, minWidth: 76 }}>Version {i + 1}</div>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${weightPct}%`, background: "linear-gradient(90deg,#186132,#14D571)" }} />
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, minWidth: 40, textAlign: "right" }}>{weightPct}%</div>
                    <div style={{ fontSize: 11.5, color: C.muted, minWidth: 130, textAlign: "right" }}>{counts.serves} shown · {counts.converts} converted</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {isLive && auditData?.raw_html && (
        <div style={{ ...glass, borderRadius: 16, padding: "24px 28px" }}>
          <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Add a live test variant</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>Generate another story direction and run it alongside what's live now — traffic is split and weighted automatically as real visits and conversions come in.</div>

          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.dim, marginBottom: 8 }}>Story direction</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {ARCHETYPES.map((a) => (
              <button key={a} onClick={() => setArchetype(a)} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: archetype === a ? "linear-gradient(135deg,#186132,#14D571)" : "rgba(0,0,0,0.05)", color: archetype === a ? "#fff" : C.muted, border: "none" }}>{a}</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button onClick={handleGenerateVariant} disabled={generating} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: generating ? "rgba(24,97,50,0.4)" : "linear-gradient(135deg,#186132,#14D571)", color: "#fff", fontSize: 12.5, fontWeight: 700, fontFamily: "'Unbounded',sans-serif", cursor: generating ? "default" : "pointer" }}>
              {generating ? "Generating…" : generatedHtml ? "Regenerate" : "Generate"}
            </button>
            {generatedHtml && (
              <button onClick={handleAddLiveTestVariant} disabled={addingLiveTest} style={{ padding: "9px 18px", borderRadius: 9, border: "none", cursor: addingLiveTest ? "default" : "pointer", background: addingLiveTest ? "rgba(91,97,244,0.3)" : "rgba(91,97,244,0.12)", color: C.violet, fontSize: 12.5, fontWeight: 700 }}>
                {addingLiveTest ? "Adding…" : "Add as live test variant"}
              </button>
            )}
          </div>

          {genError && <div style={{ fontSize: 12, color: "#DC2626", marginBottom: 10 }}>{genError}</div>}
          {addError && <div style={{ fontSize: 12, color: "#DC2626", marginBottom: 10 }}>{addError}</div>}

          {generating && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 0" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: "3px solid rgba(20,140,89,0.15)", borderTopColor: C.emerald, animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 12.5, color: C.navy }}>Generating and self-checking the rebuild…</span>
            </div>
          )}

          {generatedHtml && !generating && (
            <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, marginTop: 6 }}>
              <iframe title="Vision Pro variant preview" srcDoc={generatedHtml} sandbox="allow-same-origin allow-scripts" style={{ width: "100%", height: 420, border: "none", display: "block" }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
