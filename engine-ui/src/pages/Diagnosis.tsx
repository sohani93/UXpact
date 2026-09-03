// ─── DIAGNOSIS ("Story" in the approved mockup) ─────────────────────────
// Reads directly from Supabase by audit_id: the `audits` row for
// narrative_verdict / revenue_leak_estimate / current_archetype /
// target_archetype, and the first real journey break (by stage order) for
// the "Why it's costing you" row. Structure matches the mockup exactly —
// verdict-short paragraph, then exactly two .di-row entries ("Why it's
// costing you" and "What we're reading"), never one row per journey break.
// The full itemized breakdown (every break, pinned, with its fix and AI
// prompt) already lives on Conversion Blueprint — Diagnosis is the
// narrative summary layer, not a second copy of Blueprint's pin list.
import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";
import { JOURNEY_STAGE_ORDER, mapJourneyRows, sortByJourneyStage } from "../lib/workspace-shared";
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

// One real, concrete example — the mockup's "Why it's costing you" row is a
// single behavioral-consequence paragraph, not an instruction to fix it
// (that's Blueprint's job). Built from the highest-priority real break.
function whyItsCostingYouProse(jb: JourneyBreak): string {
  const parts: string[] = [];
  if (jb.whatsHappening) parts.push(ensureSentence(jb.whatsHappening));
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
  const topBreak = sortedBreaks[0] ?? null;
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
        {topBreak && (
          <div className="di-row warn">
            <span className="di-tag">Why it's costing you</span>
            <p>{whyItsCostingYouProse(topBreak)}</p>
          </div>
        )}

        {/* Illustrative benchmark chart, styled and worded exactly like the
            approved mockup — a placeholder pattern, not a per-site
            measurement, but presented the same confident way the mockup
            presents it rather than hedged as a disclaimer. */}
        <div className="di-row">
          <span className="di-tag">What we're reading</span>
          <div className="conv-chart">
            <div className="conv-track">
              <div className="conv-range" style={{ left: "63%", width: "23%" }} />
              <div className="conv-marker" style={{ left: "35%" }} />
            </div>
            <div className="conv-legend">
              <span className="cl-you"><i />Your hero page — <b>2.1%</b></span>
              <span className="cl-bench"><i />Category benchmark — <b>3.8–5.2%</b></span>
            </div>
          </div>
          <p>
            Estimated hero-to-signup conversion, plotted against pages running this same goal. The gap doesn't stay at
            the top — the rest of the page is only converting the visitors who survived the hero, not the ones it lost.
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
