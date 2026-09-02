// ─── UX PULSE ───────────────────────────────────────────────────────────
// One embed script serves the live variant and watches the site for
// meaningful change. Per docs/contracts/PulseStatus.md: "Watching Live" is
// read straight from site_snapshots.last_checked_at — never fabricated. If
// no site_snapshots row exists yet (script installed but no check has
// landed), a distinct "first check pending" state is shown instead.
//
// The mockup's 14-dot check strip is a fixed demo of 14 specific checks we
// have no real per-check history for — rather than fabricate that
// precision, the strip here renders one dot per real drift_events row
// (capped, oldest-first) and is captioned as flagged changes, not a fixed
// check count. If there are no drift events yet, the strip is omitted
// entirely rather than shown empty/fake.
import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";
import { embedSnippetFor } from "../lib/workspace-shared";

type DriftEvent = {
  id: string;
  element: string | null;
  regression_type: "one_off" | "repeated" | null;
  reasoning: string | null;
  detected_at: string;
};

// A site is treated as actively watched if its last check landed within one
// scheduled sweep window (6h, per the check-drift-scheduled-sweep cron) —
// plus slack for a check running slightly late, not a fabricated cutoff.
const SWEEP_WINDOW_MS = 6 * 60 * 60 * 1000 + 30 * 60 * 1000;
const CHECK_STRIP_CAP = 12;

export default function Pulse({ auditId }: { auditId: string }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [driftEvents, setDriftEvents] = useState<DriftEvent[]>([]);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const supabase = getSupabase();
        const [{ data: snapshotRows }, { data: driftRows }] = await Promise.all([
          supabase.from("site_snapshots").select("last_checked_at").eq("audit_id", auditId),
          supabase.from("drift_events").select("*").eq("audit_id", auditId).order("detected_at", { ascending: false }),
        ]);
        if (cancelled) return;
        const snapshot = snapshotRows?.[0] ?? null;
        setWatching(snapshot !== null);
        setLastCheckedAt(snapshot?.last_checked_at ?? null);
        setDriftEvents(driftRows ?? []);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load Pulse status.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [auditId]);

  const copySnippet = () => { navigator.clipboard.writeText(embedSnippetFor(auditId)); setCopiedSnippet(true); setTimeout(() => setCopiedSnippet(false), 1500); };

  const isRecent = lastCheckedAt ? Date.now() - new Date(lastCheckedAt).getTime() < SWEEP_WINDOW_MS : false;
  const liveTagClass = watching && isRecent ? "" : watching ? "overdue" : "pending";
  const liveTagText = watching && isRecent ? "Watching live" : watching ? "Watching — last check overdue" : "First check pending";

  const stripEvents = [...driftEvents].sort((a, b) => new Date(a.detected_at).getTime() - new Date(b.detected_at).getTime()).slice(-CHECK_STRIP_CAP);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><div className="ws-spinner" /></div>;
  }

  return (
    <>
      <h2>UX <span className="grad-text">Pulse</span></h2>
      <p className="sub">One script watches your live site and re-checks the story when something changes. It never fixes anything on its own.</p>

      {loadError && <div className="ws-error" style={{ marginBottom: 16 }}>{loadError}</div>}

      <div className="pulse-wave">
        <div className={`pulse-live-tag${liveTagClass ? ` ${liveTagClass}` : ""}`}>
          <span className="dt" />{liveTagText}
        </div>
        <div className="pulse-wave-clip">
          <svg className="curve" viewBox="0 0 600 56" preserveAspectRatio="none">
            <defs>
              <linearGradient id="pg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#14D571" />
                <stop offset="100%" stopColor="#7B7FFF" />
              </linearGradient>
            </defs>
            <path
              d="M0,30 C25,18 50,18 75,30 C100,42 125,42 150,30 C175,18 200,18 225,30 C250,42 275,42 300,30 C325,18 350,18 375,30 C400,42 425,42 450,30 C475,18 500,18 525,30 C550,42 575,42 600,30 M600,30 C625,18 650,18 675,30 C700,42 725,42 750,30 C775,18 800,18 825,30 C850,42 875,42 900,30 C925,18 950,18 975,30 C1000,42 1025,42 1050,30 C1075,18 1100,18 1125,30 C1150,42 1175,42 1200,30"
              fill="none" stroke="url(#pg)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
            />
          </svg>
        </div>

        {stripEvents.length > 0 && (
          <>
            <div className="check-strip">
              {stripEvents.map((ev) => <div key={ev.id} className="check-dot flag" title={ev.element ?? undefined} />)}
            </div>
            <p className="check-caption">
              Each violet bar is a real flagged change from drift history{driftEvents.length > CHECK_STRIP_CAP ? ` (last ${CHECK_STRIP_CAP} of ${driftEvents.length})` : ""} — not a fixed check count, since Pulse doesn't yet keep a full pass/fail log of every sweep.
            </p>
          </>
        )}
        {stripEvents.length === 0 && (
          <p className="check-caption">No changes flagged yet — Pulse hasn't detected a regression since watching began.</p>
        )}
      </div>

      <p className="pulse-how">Paste this once into your site's <code className="mono">&lt;head&gt;</code> — Pulse starts watching automatically, nothing else to set up.</p>
      <div className="embed-row">
        <div className="embed">{embedSnippetFor(auditId)}</div>
        <button className={`icon-btn${copiedSnippet ? " done" : ""}`} title="Copy embed script" onClick={copySnippet}>
          {copiedSnippet ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" stroke="currentColor" strokeWidth="1.8" /></svg>
          )}
        </button>
      </div>
      {!watching && (
        <p style={{ fontSize: 11.5, color: "var(--ink-dim)", marginTop: -18, marginBottom: 24 }}>Install this script on your site — Pulse starts watching after its first check lands, either from real traffic or the next scheduled sweep.</p>
      )}
      {lastCheckedAt && (
        <p style={{ fontSize: 11.5, color: "var(--ink-dim)", marginTop: -18, marginBottom: 24 }}>
          Last checked {new Date(lastCheckedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}

      {driftEvents.length > 0 ? (
        driftEvents.slice(0, 10).map((ev) => (
          <div className="drift-item" key={ev.id}>
            <div className="drift-dot" style={ev.regression_type === "one_off" ? { background: "var(--mint)", opacity: 0.7 } : undefined} />
            <div>
              <b>{ev.element || "A section"}</b>{" "}
              <span className="when">· {ev.regression_type === "repeated" ? "repeated" : "one-off"}, {new Date(ev.detected_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              {ev.reasoning && <p>{ev.reasoning}</p>}
            </div>
          </div>
        ))
      ) : (
        <div className="ws-empty">
          <div className="t">No drift detected yet</div>
          <div className="d">Once Pulse starts watching, anything that regresses the story will show up here.</div>
        </div>
      )}
    </>
  );
}
