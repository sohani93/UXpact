import { color, font, glass, gradient, radius } from "../theme";
import type { Diagnosis, JourneyStage } from "../lib/types";
import { JOURNEY_STAGE_LABEL, JOURNEY_STAGE_ORDER } from "../lib/types";
import Reveal from "../shared/Reveal";
import { StoryLens } from "./ArchetypeLens";

// Diagnosis: the story lens leads (current archetype vs. target archetype,
// by name), then the narrative verdict, then the full five-stage journey —
// every stage shown, not just the ones with a break, so the diagnosis reads
// as a complete map of the story rather than a short list of complaints.
// No numeric score anywhere — the AI's narrative reasoning is the product.
export default function DiagnosisSection({ diagnosis }: { diagnosis: Diagnosis }) {
  const domain = diagnosis.domain;
  const breaksByStage = new Map(
    (diagnosis.journeyBreaks ?? []).map((jb) => [jb.journeyStage, jb] as const),
  );

  return (
    <section id="diagnosis" style={{ maxWidth: 900, margin: "0 auto", padding: "64px 28px 40px" }}>
      <Reveal>
        <h1 style={{ fontFamily: font.display, fontSize: 30, fontWeight: 700, color: color.navy, letterSpacing: "-0.6px", margin: "0 0 6px" }}>
          Your <span style={{ background: gradient.text, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Diagnosis</span>
        </h1>
        <p style={{ fontFamily: font.body, fontSize: 14.5, color: color.muted, margin: "0 0 22px" }}>What actually happens when someone visits {domain}.</p>
      </Reveal>

      {diagnosis.currentArchetype && diagnosis.targetArchetype && (
        <Reveal delay={0.02}>
          <div style={{ ...glass, borderRadius: radius.xl, padding: "22px 26px", marginBottom: 20 }}>
            <div style={{ fontFamily: font.body, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: color.dim, marginBottom: 14 }}>The story lens</div>
            <StoryLens current={diagnosis.currentArchetype} target={diagnosis.targetArchetype} />
          </div>
        </Reveal>
      )}

      <Reveal delay={0.05}>
        <div style={{ ...glass, borderRadius: radius.xl, padding: "30px 30px 26px", marginBottom: 20 }}>
          {diagnosis.narrativeVerdict ? (
            <div style={{ borderRadius: radius.lg, padding: "26px 28px", background: gradient.brand, marginBottom: 24 }}>
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

          {diagnosis.narrativeVerdict && (
            <div>
              <div style={{ fontFamily: font.body, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: color.dim, marginBottom: 16 }}>The journey, stage by stage</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {JOURNEY_STAGE_ORDER.map((stage, i) => {
                  const jb = breaksByStage.get(stage);
                  const isLast = i === JOURNEY_STAGE_ORDER.length - 1;
                  return (
                    <Reveal key={stage} delay={0.03 * i}>
                      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: jb ? "rgba(91,97,244,0.14)" : "rgba(24,97,50,0.1)",
                            color: jb ? color.violet : color.forest,
                            fontSize: 11, fontWeight: 700, fontFamily: font.body,
                          }}>{jb ? i + 1 : "✓"}</div>
                          {!isLast && <div style={{ width: 1.5, flex: 1, minHeight: 30, background: "rgba(11,28,72,0.1)", marginTop: 4 }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : 22 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: font.body, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: jb ? color.violet : color.forest }}>{JOURNEY_STAGE_LABEL[stage]}</span>
                            {jb?.element && <span style={{ fontFamily: font.body, fontSize: 12.5, fontWeight: 600, color: color.navy }}>{jb.element}</span>}
                          </div>
                          {jb ? (
                            <>
                              <p style={{ fontFamily: font.body, fontSize: 13.5, color: "#374151", lineHeight: 1.6, margin: "0 0 4px" }}>{jb.whatsHappening}</p>
                              <p style={{ fontFamily: font.body, fontSize: 12.5, color: color.muted, lineHeight: 1.55, margin: 0 }}><span style={{ fontWeight: 600, color: color.navy }}>Should instead: </span>{jb.whatShouldHappen}</p>
                            </>
                          ) : (
                            <p style={{ fontFamily: font.body, fontSize: 13, color: color.muted, lineHeight: 1.55, margin: 0 }}>Holding up its side of the story here — no break found at this stage.</p>
                          )}
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
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
