// ─── DIAGNOSIS ("Story" in the approved mockup) ─────────────────────────
// Reads directly from Supabase by audit_id: the `audits` row for
// narrative_verdict / revenue_leak_estimate / current_archetype /
// target_archetype, and `archetype_consistency_scores` rows for the real
// journey breakdown, rendered in journey-stage order as the mockup's
// .di-row list. Per docs/adr/002-mockup-overrides-spec-diagnosis-visuals.md
// the archetype carousel and conversion-benchmark chart are part of the
// approved visual reference; the benchmark chart has no real data source
// yet, so it is relabeled here as an illustrative placeholder — everything
// else on this page is real, audited data.
import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";
import { JOURNEY_STAGE_LABELS, JOURNEY_STAGE_ORDER, mapJourneyRows, sortByJourneyStage } from "../lib/workspace-shared";
import type { JourneyBreak } from "../lib/ui-types";
import ArchetypeCarousel from "../components/ArchetypeCarousel";

type AuditRow = {
  id: string;
  domain: string;
  narrative_verdict: string | null;
  revenue_leak_estimate: string | null;
  current_archetype: string | null;
  target_archetype: string | null;
};

function ensureSentence(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

// Turns one real journey break into the readable prose the mockup's .di-row
// paragraph expects, combining whatsHappening / whatShouldHappen / reason —
// this IS the real journey breakdown, not the mockup's two demo rows.
function journeyBreakProse(jb: JourneyBreak): string {
  const parts: string[] = [];
  if (jb.whatsHappening) parts.push(ensureSentence(jb.whatsHappening));
  if (jb.whatShouldHappen) {
    const should = jb.whatShouldHappen.trim();
    const lower = should.charAt(0).toLowerCase() + should.slice(1);
    parts.push(ensureSentence(`Instead, it should ${lower}`));
  }
  if (jb.reason) parts.push(ensureSentence(jb.reason));
  return parts.join(" ");
}

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
    return <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><div className="ws-spinner" /></div>;
  }

  if (loadError || !audit) {
    return <div className="ws-error">{loadError ?? "This audit couldn't be found."}</div>;
  }

  const domain = audit.domain || "yoursite.com";
  const sortedBreaks = sortByJourneyStage(journeyBreaks);
  const stagesWithBreaks = new Set(sortedBreaks.map((jb) => jb.journeyStage));

  if (!audit.narrative_verdict) {
    return (
      <div className="ws-error">
        The AI diagnosis didn't complete for this run — no narrative verdict, journey breakdown, or revenue estimate is available. Re-run the audit to try again.
      </div>
    );
  }

  return (
    <>
      <div className="panel-eyebrow">{domain}, right now</div>
      <div className="shift-headline">
        <span className="arc from">{audit.current_archetype ? `The ${audit.current_archetype}` : "Unclear story"}</span>
        <span className="arrow">→</span>
        <span className="arc to">{audit.target_archetype ? `The ${audit.target_archetype}` : "—"}</span>
      </div>
      <p className="verdict-short">{audit.narrative_verdict}</p>

      <div className="diagnosis-insights">
        {sortedBreaks.map((jb, i) => (
          <div key={i} className={`di-row${i === 0 ? " warn" : ""}`}>
            <span className="di-tag">{JOURNEY_STAGE_LABELS[jb.journeyStage] ?? jb.journeyStage}{jb.element ? ` — ${jb.element}` : ""}</span>
            <p>{journeyBreakProse(jb)}</p>
          </div>
        ))}

        {/* Illustrative benchmark chart — per ADR 002 this stays visually,
            but has no real per-site data source yet, so it is explicitly
            labeled as an example rather than a measured number. */}
        <div className="di-row">
          <span className="di-tag">Illustrative example — not measured for {domain}</span>
          <div className="conv-chart">
            <div className="conv-track">
              <div className="conv-range" style={{ left: "63%", width: "23%" }} />
              <div className="conv-marker" style={{ left: "35%" }} />
            </div>
            <div className="conv-legend">
              <span className="cl-you"><i />Example hero page — <b>2.1%</b></span>
              <span className="cl-bench"><i />Example category benchmark — <b>3.8–5.2%</b></span>
            </div>
          </div>
          <p>
            A sample of what a hero-to-signup conversion gap can look like for this kind of page — not a number UXpact has measured for {domain}. There's no live
            data source computing this yet; treat it as a shape of the pattern, not a real reading.
          </p>
        </div>
      </div>

      <div className="carousel-label">The six story archetypes — swipe to browse</div>
      <div className="story-lower-grid">
        <ArchetypeCarousel currentArchetype={audit.current_archetype} targetArchetype={audit.target_archetype} />
        <div className="leak-card">
          <span className="leak-fig">{audit.revenue_leak_estimate || "Not estimated"}</span>
          <span className="leak-text">What this gap is costing {domain} in lost conversions.</span>
        </div>
      </div>

      <div className="signal-dots" title="Arrival, Understanding, Trust-building, Decision, Action — where the story breaks">
        {JOURNEY_STAGE_ORDER.map((stage) => (
          <span key={stage} className={`jdot${stagesWithBreaks.has(stage) ? " on" : ""}`} />
        ))}
      </div>
    </>
  );
}
