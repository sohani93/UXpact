// ─── UX PULSE ───────────────────────────────────────────────────────────
// One embed script serves the live variant and watches the site for
// meaningful change. Per docs/contracts/PulseStatus.md: "Watching Live" is
// read straight from site_snapshots.last_checked_at — never fabricated. If
// no site_snapshots row exists yet (script installed but no check has
// landed), a distinct "first check pending" state is shown instead.
import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";
import { C, embedSnippetFor, glass } from "../lib/workspace-shared";

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
        UX{" "}<span style={{ background: "linear-gradient(90deg,#186132,#14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Pulse</span>
      </h1>
      <p style={{ fontSize: 14, color: C.muted, margin: "0 0 20px" }}>One script watches your live site, re-runs the diagnosis when it changes, and tells you if it got worse. It never auto-fixes anything.</p>

      {loadError && (
        <div style={{ borderRadius: 12, padding: "16px 20px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", fontSize: 13, color: "#991B1B", marginBottom: 16 }}>{loadError}</div>
      )}

      <div style={{ ...glass, borderRadius: 16, padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          {watching && isRecent ? (
            <>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.emerald, boxShadow: "0 0 0 4px rgba(20,140,89,0.15)" }} />
              <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 700, color: C.emerald }}>Watching Live</span>
            </>
          ) : watching ? (
            <>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.violet }} />
              <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 700, color: C.violet }}>Watching — last check overdue</span>
            </>
          ) : (
            <>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.dim }} />
              <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 700, color: C.dim }}>First check pending</span>
            </>
          )}
          {lastCheckedAt && (
            <span style={{ fontSize: 11.5, color: C.muted }}>
              · last checked {new Date(lastCheckedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        <code style={{ display: "block", fontSize: 12, color: "#374151", background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 8, padding: "12px 14px", fontFamily: "monospace", marginBottom: 12 }}>{embedSnippetFor(auditId)}</code>
        <button onClick={copySnippet} style={{ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: copiedSnippet ? "linear-gradient(135deg,#186132,#14D571)" : "rgba(0,0,0,0.06)", color: copiedSnippet ? "#fff" : C.navy, fontSize: 12, fontWeight: 700 }}>{copiedSnippet ? "Copied" : "Copy embed script"}</button>

        {!watching && (
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>Install this script on your site — Pulse starts watching after its first check lands, either from real traffic or the next scheduled sweep.</div>
        )}

        {driftEvents.length > 0 && (
          <div style={{ marginTop: 18, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.dim, marginBottom: 10 }}>Drift history</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {driftEvents.slice(0, 8).map((ev) => (
                <div key={ev.id} style={{ fontSize: 12.5, color: "#374151" }}>
                  <span style={{ fontWeight: 660 }}>{ev.element || "A section"}</span> — {ev.regression_type === "repeated" ? "repeated regression" : ev.regression_type === "one_off" ? "one-off dip" : "worse"} on {new Date(ev.detected_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  {ev.reasoning && <div style={{ color: C.muted, marginTop: 2, fontSize: 11.5 }}>{ev.reasoning}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
