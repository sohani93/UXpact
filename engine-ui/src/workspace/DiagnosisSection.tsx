import { color, font, glass, gradient, radius } from "../theme";
import type { Diagnosis } from "../lib/types";
import { JOURNEY_STAGE_LABEL, JOURNEY_STAGE_ORDER } from "../lib/types";
import Reveal from "../shared/Reveal";

// Diagnosis: the narrative verdict always leads, then the journey
// breakdown in journey order, then the revenue leak estimate. No numeric
// score anywhere — the AI's narrative reasoning is the product.
export default function DiagnosisSection({ diagnosis }: { diagnosis: Diagnosis }) {
  const domain = diagnosis.domain;
  const sortedBreaks = [...(diagnosis.journeyBreaks ?? [])].sort(
    (a, b) => JOURNEY_STAGE_ORDER.indexOf(a.journeyStage) - JOURNEY_STAGE_ORDER.indexOf(b.journeyStage),
  );

  return (
    <section id="diagnosis" style={{ maxWidth: 900, margin: "0 auto", padding: "64px 28px 40px" }}>
      <Reveal>
        <h1 style={{ fontFamily: font.display, fontSize: 30, fontWeight: 700, color: color.navy, letterSpacing: "-0.6px", margin: "0 0 6px" }}>
          Your <span style={{ background: gradient.text, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Diagnosis</span>
        </h1>
        <p style={{ fontFamily: font.body, fontSize: 14.5, color: color.muted, margin: "0 0 28px" }}>What actually happens when someone visits {domain}.</p>
      </Reveal>

      <Reveal delay={0.05}>
        <div style={{ ...glass, borderRadius: radius.xl, padding: "30px 30px 26px", marginBottom: 20 }}>
          {diagnosis.narrativeVerdict ? (
            <div style={{ borderRadius: radius.lg, padding: "26px 28px", background: gradient.brand, marginBottom: sortedBreaks.length > 0 ? 24 : 0 }}>
              <div style={{ fontFamily: font.body, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "rgba(255,255,255,0.65)", marginBottom: 10 }}>The verdict</div>
              <p style={{ fontFamily: font.body, fontSize: 17, fontWeight: 600, color: "#fff", lineHeight: 1.55, margin: 0, letterSpacing: "-0.2px" }}>{diagnosis.narrativeVerdict}</p>
            </div>
          ) : (
            <div style={{ borderRadius: radius.lg, padding: "22px 26px", background: "rgba(179,38,30,0.06)", border: "1px solid rgba(179,38,30,0.15)" }}>
              <p style={{ fontFamily: font.body, fontSize: 13.5, color: "#8a1f19", margin: 0, lineHeight: 1.6 }}>
                {diagnosis.diagnosisError ?? "The AI didn't finish reading this site's story this run — no narrative verdict, journey breakdown, or revenue estimate is available. Read the site again to try again."}
              </p>
            </div>
          )}

          {sortedBreaks.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontFamily: font.body, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: color.dim, marginBottom: 6 }}>The journey, stage by stage</div>
              {diagnosis.currentArchetype && diagnosis.targetArchetype && (
                <p style={{ fontFamily: font.body, fontSize: 12, color: color.muted, marginBottom: 18, lineHeight: 1.6 }}>
                  Read as moving from how {domain} presents today toward how it should read for this goal — a shift from something more <em>{directionPhrase(diagnosis.currentArchetype)}</em> to something more <em>{directionPhrase(diagnosis.targetArchetype)}</em>.
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {sortedBreaks.map((jb, i) => (
                  <Reveal key={i} delay={0.03 * i}>
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(91,97,244,0.12)", color: color.violet, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2, fontFamily: font.body }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: font.body, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: color.violet }}>{JOURNEY_STAGE_LABEL[jb.journeyStage]}</span>
                          {jb.element && <span style={{ fontFamily: font.body, fontSize: 12.5, fontWeight: 600, color: color.navy }}>{jb.element}</span>}
                        </div>
                        <p style={{ fontFamily: font.body, fontSize: 13.5, color: "#374151", lineHeight: 1.6, margin: "0 0 4px" }}>{jb.whatsHappening}</p>
                        <p style={{ fontFamily: font.body, fontSize: 12.5, color: color.muted, lineHeight: 1.55, margin: 0 }}><span style={{ fontWeight: 600, color: color.navy }}>Should instead: </span>{jb.whatShouldHappen}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {diagnosis.revenueLeakEstimate && (
        <Reveal delay={0.1}>
          <div style={{ ...glass, borderRadius: radius.xl, padding: "26px 30px" }}>
            <h2 style={{ fontFamily: font.display, fontSize: 18, fontWeight: 700, color: color.navy, margin: "0 0 4px" }}>Revenue Leak</h2>
            <p style={{ fontFamily: font.body, fontSize: 13, color: color.muted, margin: "0 0 12px" }}>Grounded in the specific breaks above, not a generic estimate.</p>
            <p style={{ fontFamily: font.display, fontSize: 22, fontWeight: 700, color: color.forest, margin: 0 }}>
              {diagnosis.revenueLeakEstimate} <span style={{ fontFamily: font.body, fontWeight: 500, color: color.muted, fontSize: 13.5 }}>estimated at risk</span>
            </p>
          </div>
        </Reveal>
      )}
    </section>
  );
}

// Archetypes are internal reasoning only, never shown as a bare label —
// even here, framed as a description of the shift rather than a name.
function directionPhrase(archetype: string): string {
  const phrases: Record<string, string> = {
    Hero: "fast and outcome-first",
    Sage: "expert and credible",
    Outlaw: "bold and different",
    Caregiver: "warm and supportive",
    Creator: "crafted and original",
    Ruler: "premium and authoritative",
  };
  return phrases[archetype] ?? "different";
}
