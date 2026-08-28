import { useEffect, useState } from "react";
import { color, font } from "../theme";
import type { Diagnosis } from "../lib/types";
import { getDb } from "../lib/db";
import ProgressRail from "../shared/ProgressRail";
import DiagnosisSection from "./DiagnosisSection";
import BlueprintSection from "./BlueprintSection";
import PulseSection from "./PulseSection";

const SECTIONS = [
  { id: "diagnosis", label: "Diagnosis" },
  { id: "blueprint", label: "Conversion Blueprint" },
  { id: "pulse", label: "UX Pulse" },
];

function mapJourneyRows(rows: any[]) {
  return rows.map((r) => ({
    journeyStage: r.journey_stage,
    element: r.element,
    whatsHappening: r.current_archetype_signal,
    whatShouldHappen: r.what_should_happen,
    reason: r.reason,
    fix: r.fix,
    aiPrompt: r.ai_prompt,
  }));
}

export default function Workspace({ auditId }: { auditId: string }) {
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const cached = sessionStorage.getItem(`diagnosis:${auditId}`);
      try {
        const db = getDb();
        const [{ data: auditRows, error: auditErr }, { data: journeyRows }] = await Promise.all([
          db.from("audits").select("*").eq("id", auditId),
          db.from("archetype_consistency_scores").select("*").eq("audit_id", auditId),
        ]);
        if (auditErr) throw new Error(auditErr.message);
        let audit = auditRows?.[0] ?? null;
        if (!audit && cached) {
          try { audit = JSON.parse(cached); } catch { /* fall through */ }
        }
        if (!audit) throw new Error("This diagnosis wasn't found.");

        setDiagnosis({
          auditId: audit.id ?? auditId,
          url: audit.url,
          domain: audit.domain,
          createdAt: audit.created_at,
          domData: audit.dom_data,
          currentArchetype: audit.current_archetype ?? null,
          targetArchetype: audit.target_archetype ?? null,
          narrativeVerdict: audit.narrative_verdict ?? null,
          revenueLeakEstimate: audit.revenue_leak_estimate ?? null,
          journeyBreaks: mapJourneyRows(journeyRows ?? []),
          diagnosisError: audit.narrative_verdict ? null : "The AI diagnosis didn't complete for this run.",
          rawHtml: audit.raw_html ?? null,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load this workspace.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [auditId]);

  if (loading && !diagnosis) {
    return (
      <div style={{ minHeight: "100vh", background: color.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(20,140,89,0.15)", borderTopColor: color.forest, animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }
  if (error && !diagnosis) {
    return <div style={{ minHeight: "100vh", background: color.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.body, color: color.navy }}>{error}</div>;
  }
  if (!diagnosis) return null;

  return (
    <div className="reveal in-view" style={{ minHeight: "100vh", background: color.bg, position: "relative" }}>
      <ProgressRail sections={SECTIONS} />
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "20px 28px 0 92px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#186132,#14D571)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" /></svg>
        </div>
        <span style={{ fontFamily: font.display, fontSize: 14.5, fontWeight: 700, color: color.navy }}>UXpact</span>
        <span style={{ fontFamily: font.body, fontSize: 12, color: color.dim, marginLeft: 8 }}>{diagnosis.domain}</span>
      </div>

      <div style={{ paddingLeft: 64 }}>
        <DiagnosisSection diagnosis={diagnosis} />
        <BlueprintSection diagnosis={diagnosis} />
        <PulseSection diagnosis={diagnosis} />
      </div>

      <div style={{ textAlign: "center", padding: "0 0 40px" }}>
        <p style={{ fontFamily: font.body, fontSize: 11, color: color.dim, margin: 0 }}>{diagnosis.domain} · Audit #{diagnosis.auditId} · UXpact</p>
      </div>
    </div>
  );
}
