// ─── DIAGNOSIS ──────────────────────────────────────────────────────────
// Prose-only story diagnosis for the submitted page. No numeric score, no
// card carousel, no badge — per docs/contracts/DiagnosisResult.md the
// contract itself carries none. Reads directly from Supabase by audit_id:
// the `audits` row for narrative_verdict / revenue_leak_estimate /
// current_archetype / target_archetype, and `archetype_consistency_scores`
// rows for the journey breakdown, shown in journey-stage order.
import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";
import { C, glass, JOURNEY_STAGE_LABELS, mapJourneyRows, sortByJourneyStage } from "../lib/workspace-shared";
import type { JourneyBreak } from "../lib/ui-types";

type AuditRow = {
  id: string;
  domain: string;
  narrative_verdict: string | null;
  revenue_leak_estimate: string | null;
  current_archetype: string | null;
  target_archetype: string | null;
};

export default function Diagnosis({ auditId }: { auditId: string }) {
  const [audit, setAudit] = useState<AuditRow | null>(null);
  const [journeyBreaks, setJourneyBreaks] = useState<JourneyBreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const supabase = getSupabase();
        const [{ data: auditRows, error: auditErr }, { data: journeyRows }] = await Promise.all([
          supabase.from("audits").select("id, domain, narrative_verdict, revenue_leak_estimate, current_archetype, target_archetype").eq("id", auditId),
          supabase.from("archetype_consistency_scores").select("*").eq("audit_id", auditId),
        ]);
        if (cancelled) return;
        if (auditErr) throw new Error(auditErr.message);
        const row = auditRows?.[0] ?? null;
        if (!row) throw new Error("This audit couldn't be found.");
        setAudit(row);
        setJourneyBreaks(mapJourneyRows(journeyRows));
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load this diagnosis.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [auditId]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 28px" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "4px solid rgba(20,140,89,0.2)", borderTop: `4px solid ${C.emerald}`, animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (loadError || !audit) {
    return (
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 28px 8px" }}>
        <div style={{ ...glass, borderRadius: 16, padding: "24px 26px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)" }}>
          <p style={{ fontSize: 13, color: "#991B1B", margin: 0, lineHeight: 1.6 }}>{loadError ?? "This audit couldn't be found."}</p>
        </div>
      </div>
    );
  }

  const domain = audit.domain || "yoursite.com";
  const sortedBreaks = sortByJourneyStage(journeyBreaks);

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 28px 8px" }}>
      <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 26, fontWeight: 700, color: C.navy, letterSpacing: "-0.5px", margin: "0 0 4px" }}>
        Your{" "}<span style={{ background: "linear-gradient(90deg,#186132,#14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Diagnosis</span>
      </h1>
      <p style={{ fontSize: 14, color: C.muted, margin: "0 0 20px" }}>What actually happens when someone visits {domain}.</p>

      {!audit.narrative_verdict ? (
        <div style={{ ...glass, borderRadius: 16, padding: "24px 26px" }}>
          <div style={{ borderRadius: 12, padding: "20px 24px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)" }}>
            <p style={{ fontSize: 13, color: "#991B1B", margin: 0, lineHeight: 1.6 }}>
              The AI diagnosis didn't complete for this run — no narrative verdict, journey breakdown, or revenue estimate is available. Re-run the audit to try again.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Narrative verdict — always shown first, prose only. */}
          <div style={{ ...glass, borderRadius: 16, padding: "28px 28px 24px", marginBottom: 16 }}>
            <div style={{ borderRadius: 12, padding: "24px 26px", background: "linear-gradient(135deg,#186132 0%,#148C59 60%,#14D571 100%)" }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "rgba(255,255,255,0.6)", marginBottom: 10 }}>The verdict</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", lineHeight: 1.55, margin: 0, letterSpacing: "-0.2px" }}>{audit.narrative_verdict}</p>
            </div>
          </div>

          {/* Journey breakdown, in journey-stage order. */}
          {sortedBreaks.length > 0 && (
            <div style={{ ...glass, borderRadius: 16, padding: "26px 28px", marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: C.dim, marginBottom: 4 }}>The journey, stage by stage</div>
              {audit.current_archetype && audit.target_archetype && (
                <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 18 }}>
                  Read through the lens of moving from how {domain} presents today (<span style={{ fontWeight: 700, color: C.navy }}>{audit.current_archetype}</span>) toward how it should for this goal (<span style={{ fontWeight: 700, color: C.navy }}>{audit.target_archetype}</span>).
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {sortedBreaks.map((jb, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", paddingBottom: i < sortedBreaks.length - 1 ? 20 : 0, borderBottom: i < sortedBreaks.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(91,97,244,0.12)", color: C.violet, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.violet }}>{JOURNEY_STAGE_LABELS[jb.journeyStage] ?? jb.journeyStage}</span>
                        {jb.element && <span style={{ fontSize: 12.5, fontWeight: 660, color: C.navy, fontFamily: "'Unbounded', sans-serif" }}>{jb.element}</span>}
                      </div>
                      <p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.65, margin: "0 0 6px" }}>{jb.whatsHappening}</p>
                      <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, margin: "0 0 6px" }}><span style={{ fontWeight: 660, color: C.navy }}>Should instead: </span>{jb.whatShouldHappen}</p>
                      {jb.reason && (
                        <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.6, margin: 0 }}><span style={{ fontWeight: 660 }}>Why: </span>{jb.reason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revenue leak estimate, grounded in the breaks above. */}
          {audit.revenue_leak_estimate && (
            <div style={{ ...glass, borderRadius: 16, padding: "24px 28px", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 17, fontWeight: 700, color: C.navy, margin: "0 0 4px" }}>Revenue Leak</h2>
              <p style={{ fontSize: 13, color: C.muted, margin: "0 0 10px" }}>
                {sortedBreaks.length > 0
                  ? `Grounded in the ${sortedBreaks.length} journey break${sortedBreaks.length === 1 ? "" : "s"} found above — not a generic estimate.`
                  : "Grounded in the specific breaks found in this diagnosis, not a generic estimate."}
              </p>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.forest, margin: 0 }}>{audit.revenue_leak_estimate} <span style={{ fontWeight: 500, color: C.muted, fontSize: 13 }}>estimated at risk</span></p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
