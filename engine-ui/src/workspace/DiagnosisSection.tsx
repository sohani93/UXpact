import { color, font } from "../theme";
import type { Archetype, Diagnosis } from "../lib/types";
import { JOURNEY_STAGE_ORDER } from "../lib/types";
import Reveal from "../shared/Reveal";
import { ARCHETYPE_META } from "./ArchetypeLens";

// Diagnosis is read, not scanned: one continuous piece of writing — the
// verdict, then what happens stage by stage, then the cost — in plain
// sentences. No score, no cards, no stage labels, no archetype badges.
// The archetype lens is reasoning the writing is built from, not a widget;
// it only ever surfaces as ordinary words inside a sentence.
function archetypePhrase(archetype: Archetype): string {
  const essence = ARCHETYPE_META[archetype]?.essence.replace(/\.$/, "").toLowerCase() ?? "";
  return `The ${archetype} — ${essence}`;
}

export default function DiagnosisSection({ diagnosis }: { diagnosis: Diagnosis }) {
  const domain = diagnosis.domain;
  const orderedBreaks = [...(diagnosis.journeyBreaks ?? [])].sort(
    (a, b) => JOURNEY_STAGE_ORDER.indexOf(a.journeyStage) - JOURNEY_STAGE_ORDER.indexOf(b.journeyStage),
  );
  const shiftsStory = diagnosis.currentArchetype && diagnosis.targetArchetype && diagnosis.currentArchetype !== diagnosis.targetArchetype;

  return (
    <section id="diagnosis" style={{ maxWidth: 700, margin: "0 auto", padding: "76px 28px 60px" }}>
      <Reveal>
        <h1 style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, color: color.navy, letterSpacing: "-0.5px", margin: "0 0 6px" }}>
          Your <span style={{ background: "linear-gradient(90deg,#186132,#14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Diagnosis</span>
        </h1>
        <p style={{ fontFamily: font.body, fontSize: 14, color: color.muted, margin: "0 0 34px" }}>What actually happens when someone visits {domain}.</p>
      </Reveal>

      {diagnosis.narrativeVerdict ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <Reveal delay={0.04}>
            <p style={{ fontFamily: font.body, fontSize: 18.5, lineHeight: 1.75, color: color.navy, fontWeight: 500, margin: 0, letterSpacing: "-0.1px" }}>
              {diagnosis.narrativeVerdict}
              {shiftsStory && (
                <> Right now the site reads like {archetypePhrase(diagnosis.currentArchetype as Archetype)}, when the goal calls for something closer to {archetypePhrase(diagnosis.targetArchetype as Archetype)}.</>
              )}
            </p>
          </Reveal>

          {orderedBreaks.map((jb, i) => (
            <Reveal key={i} delay={0.04 * (i + 2)}>
              <p style={{ fontFamily: font.body, fontSize: 15.5, lineHeight: 1.8, color: "#374151", margin: 0 }}>
                <strong style={{ color: color.navy, fontWeight: 700 }}>{jb.element}. </strong>
                {jb.whatsHappening} {jb.whatShouldHappen}
              </p>
            </Reveal>
          ))}

          {diagnosis.revenueLeakEstimate && (
            <Reveal delay={0.04 * (orderedBreaks.length + 2)}>
              <p style={{ fontFamily: font.body, fontSize: 15.5, lineHeight: 1.8, color: color.forest, fontWeight: 600, margin: 0 }}>
                Left as it is, this is likely costing {domain} somewhere around {diagnosis.revenueLeakEstimate} in lost conversions.
              </p>
            </Reveal>
          )}
        </div>
      ) : (
        <Reveal delay={0.05}>
          <p style={{ fontFamily: font.body, fontSize: 15, color: "#8a1f19", lineHeight: 1.7, margin: 0 }}>
            {diagnosis.diagnosisError ?? "The AI didn't finish reading this site's story this run — no narrative verdict, journey breakdown, or revenue estimate is available. Read the site again to try again."}
          </p>
        </Reveal>
      )}
    </section>
  );
}
