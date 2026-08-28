import { color } from "../theme";
import type { Archetype } from "../lib/types";

// The six story archetypes are the reasoning engine under the whole
// product — never a UI widget of their own. They surface two places only:
// as ordinary words inside the diagnosis's prose, and as the picker a
// person uses to choose a rebuild direction in Conversion Blueprint.
export const ARCHETYPES: Archetype[] = ["Hero", "Sage", "Outlaw", "Caregiver", "Creator", "Ruler"];

export const ARCHETYPE_META: Record<Archetype, { essence: string; accent: string; path: string; viewBox?: string }> = {
  Hero: { essence: "Fast, outcome-first — proves itself through results.", accent: color.forest, path: "M6 18L15 7M15 7H9M15 7v6" },
  Sage: { essence: "Expert, credible — proves itself through depth.", accent: color.navy, path: "M4 7h16M4 12h16M4 17h10" },
  Outlaw: { essence: "Bold, contrarian — proves itself through contrast.", accent: color.violet, path: "M13 3L6 13h5l-1.5 8L18 10h-5l0-7z" },
  Caregiver: { essence: "Warm, reassuring — proves itself through care.", accent: color.forest, path: "M8.5 12a3.5 3.5 0 110-7 3.5 3.5 0 010 7zM15.5 12a3.5 3.5 0 110-7 3.5 3.5 0 010 7zM4 20c1-3.5 3.5-5 8-5s7 1.5 8 5", viewBox: "0 0 24 24" },
  Creator: { essence: "Crafted, original — proves itself through craft.", accent: color.navy, path: "M5 19c2.5-8.5 5-11.5 14-15-3 9.5-6.5 12.5-14 15z" },
  Ruler: { essence: "Premium, authoritative — proves itself through exclusivity.", accent: color.navy, path: "M4 18h16M5 18l1-8 4 4 2-7 2 7 4-4 1 8" },
};

export function ArchetypeIcon({ archetype, size = 18 }: { archetype: Archetype; size?: number }) {
  const meta = ARCHETYPE_META[archetype];
  return (
    <svg width={size} height={size} viewBox={meta.viewBox ?? "0 0 22 22"} fill="none">
      <path d={meta.path} stroke="#fff" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
