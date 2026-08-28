import { color, font } from "../theme";
import type { Archetype } from "../lib/types";

// The six story archetypes are the reasoning engine under the whole product
// — never a bare personality-quiz result, but never invisible either. Every
// verdict, every journey break, every generated rebuild is read through
// this lens, so the lens itself is always on screen: current story vs.
// target story, by name, with what that name actually means.
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

function ArchetypeBadge({ archetype, label, size = "md" }: { archetype: Archetype; label: string; size?: "sm" | "md" }) {
  const meta = ARCHETYPE_META[archetype];
  const dim = size === "sm" ? 32 : 44;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <div style={{ width: dim, height: dim, borderRadius: "50%", background: meta.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 3px 10px rgba(11,28,72,0.18)" }}>
        <ArchetypeIcon archetype={archetype} size={size === "sm" ? 15 : 19} />
      </div>
      <div>
        <div style={{ fontFamily: font.body, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: color.dim }}>{label}</div>
        <div style={{ fontFamily: font.display, fontSize: size === "sm" ? 13 : 15.5, fontWeight: 700, color: color.navy, lineHeight: 1.3 }}>The {archetype}</div>
        {size === "md" && <div style={{ fontFamily: font.body, fontSize: 11.5, color: color.muted, maxWidth: 230, lineHeight: 1.45, marginTop: 1 }}>{meta.essence}</div>}
      </div>
    </div>
  );
}

export function StoryLens({ current, target, size = "md" }: { current: Archetype | null; target: Archetype | null; size?: "sm" | "md" }) {
  if (!current || !target) return null;
  const sameStory = current === target;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size === "sm" ? 12 : 20, flexWrap: "wrap" }}>
      <ArchetypeBadge archetype={current} label="Reads today as" size={size} />
      {!sameStory && (
        <>
          <svg width="18" height="12" viewBox="0 0 18 12" style={{ flexShrink: 0, opacity: 0.35 }}>
            <path d="M0 6h15m-5-5l5 5-5 5" stroke={color.dim} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <ArchetypeBadge archetype={target} label="Should read as" size={size} />
        </>
      )}
    </div>
  );
}
