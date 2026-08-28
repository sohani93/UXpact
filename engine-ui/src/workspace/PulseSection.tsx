import { useEffect, useState } from "react";
import { color, font, glass, gradient, radius } from "../theme";
import type { Diagnosis } from "../lib/types";
import { embedSnippetFor } from "../lib/api";
import { getDb } from "../lib/db";
import Reveal from "../shared/Reveal";

type DriftEvent = { id: string; element: string | null; regression_type: string | null; reasoning: string | null; detected_at: string };

export default function PulseSection({ diagnosis }: { diagnosis: Diagnosis }) {
  const [copied, setCopied] = useState(false);
  const [driftEvents, setDriftEvents] = useState<DriftEvent[]>([]);

  useEffect(() => {
    const load = async () => {
      const db = getDb();
      const { data } = await db.from("drift_events").select("*").eq("audit_id", diagnosis.auditId).order("detected_at", { ascending: false }).limit(8);
      setDriftEvents((data as DriftEvent[]) ?? []);
    };
    void load();
  }, [diagnosis.auditId]);

  const copySnippet = () => { navigator.clipboard.writeText(embedSnippetFor(diagnosis.auditId)); setCopied(true); setTimeout(() => setCopied(false), 1400); };

  return (
    <section id="pulse" style={{ maxWidth: 900, margin: "0 auto", padding: "40px 28px 90px" }}>
      <Reveal>
        <h1 style={{ fontFamily: font.display, fontSize: 30, fontWeight: 700, color: color.navy, letterSpacing: "-0.6px", margin: "0 0 6px" }}>
          UX <span style={{ background: gradient.text, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Pulse</span>
        </h1>
        <p style={{ fontFamily: font.body, fontSize: 14, color: color.muted, margin: "0 0 22px" }}>One script watches your live site, re-runs the diagnosis when it changes, and tells you if it got worse. It never auto-fixes anything.</p>
      </Reveal>

      <Reveal delay={0.05}>
        <div style={{ ...glass, borderRadius: radius.xl, padding: "26px 28px" }}>
          <code style={{ display: "block", fontSize: 12, color: "#374151", background: "rgba(255,255,255,0.75)", border: `1px solid ${color.border}`, borderRadius: 8, padding: "12px 14px", fontFamily: "monospace", marginBottom: 14 }}>{embedSnippetFor(diagnosis.auditId)}</code>
          <button onClick={copySnippet} style={{ padding: "9px 20px", borderRadius: 9, border: "none", cursor: "pointer", background: copied ? gradient.brand : "rgba(11,28,72,0.05)", color: copied ? "#fff" : color.navy, fontSize: 12.5, fontWeight: 700, fontFamily: font.body }}>{copied ? "Copied" : "Copy embed script"}</button>

          {driftEvents.length > 0 && (
            <div style={{ marginTop: 22, borderTop: `1px solid ${color.border}`, paddingTop: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: color.dim, marginBottom: 12, fontFamily: font.body }}>Drift history</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {driftEvents.map((ev) => (
                  <div key={ev.id} style={{ fontFamily: font.body, fontSize: 13, color: "#374151" }}>
                    <span style={{ fontWeight: 700 }}>{ev.element || "A section"}</span> — {ev.regression_type === "repeated" ? "repeated regression" : ev.regression_type === "one_off" ? "one-off dip" : "worse"} on {new Date(ev.detected_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {ev.reasoning && <div style={{ color: color.muted, marginTop: 2, fontSize: 12 }}>{ev.reasoning}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div style={{ borderRadius: radius.lg, padding: "20px 24px", background: "#EDEDFA", border: "1px solid rgba(91,97,244,0.12)", marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{ fontFamily: font.display, fontSize: 13, fontWeight: 700, color: color.navy }}>Design Tool Plugins</span>
            <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(91,97,244,0.1)", color: color.violet, borderRadius: radius.pill, padding: "2px 9px", fontFamily: font.body }}>Coming soon</span>
          </div>
          <p style={{ fontFamily: font.body, fontSize: 12.5, color: color.muted, margin: 0, lineHeight: 1.55 }}>This diagnosis, surfaced contextually inside Figma, Framer, Webflow, and WordPress — not built yet, so it isn't pretending to be interactive here.</p>
        </div>
      </Reveal>
    </section>
  );
}
