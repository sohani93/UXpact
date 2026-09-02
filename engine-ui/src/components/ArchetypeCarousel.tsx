// ─── ARCHETYPE CAROUSEL ─────────────────────────────────────────────────
// The mockup's swipeable six-archetype card stack (.stack/.a-card), ported
// from vanilla JS drag/swipe handling to React pointer events + state. Per
// docs/adr/002-mockup-overrides-spec-diagnosis-visuals.md this carousel is
// part of the approved visual reference for the Story page. The essence
// copy is fixed reference material describing what each archetype is (not
// per-audit data); which two cards get highlighted as "Reads as today" /
// "Should read as" is wired to the audit's real current/target archetype.
import { useRef, useState, type PointerEvent } from "react";

type ArchetypeMeta = { essence: string; path: string; viewBox: string; tint: "mint" | "violet" };

const ARCHETYPES: Record<string, ArchetypeMeta> = {
  Hero: { essence: "Leads with the outcome and proves itself through speed and results.", path: "M6 18L15 7M15 7H9M15 7v6", viewBox: "0 0 22 22", tint: "mint" },
  Sage: { essence: "Leads with expertise and proves itself through depth and evidence.", path: "M4 7h16M4 12h16M4 17h10", viewBox: "0 0 22 22", tint: "violet" },
  Outlaw: { essence: "Leads with contrast and proves itself by breaking from convention.", path: "M13 3L6 13h5l-1.5 8L18 10h-5l0-7z", viewBox: "0 0 22 22", tint: "mint" },
  Caregiver: { essence: "Leads with reassurance and proves itself through care and support.", path: "M8.5 12a3.5 3.5 0 110-7 3.5 3.5 0 010 7zM15.5 12a3.5 3.5 0 110-7 3.5 3.5 0 010 7zM4 20c1-3.5 3.5-5 8-5s7 1.5 8 5", viewBox: "0 0 24 24", tint: "violet" },
  Creator: { essence: "Leads with craft and proves itself through originality.", path: "M5 19c2.5-8.5 5-11.5 14-15-3 9.5-6.5 12.5-14 15z", viewBox: "0 0 22 22", tint: "mint" },
  Ruler: { essence: "Leads with authority and proves itself through exclusivity and polish.", path: "M4 18h16M5 18l1-8 4 4 2-7 2 7 4-4 1 8", viewBox: "0 0 22 22", tint: "violet" },
};
const ORDER = ["Ruler", "Hero", "Sage", "Outlaw", "Caregiver", "Creator"];

export default function ArchetypeCarousel({ currentArchetype, targetArchetype }: { currentArchetype: string | null; targetArchetype: string | null }) {
  const startIndex = Math.max(0, ORDER.indexOf(currentArchetype ?? ""));
  const [current, setCurrent] = useState(startIndex);
  const dragStartX = useRef<number | null>(null);
  const stackRef = useRef<HTMLDivElement | null>(null);

  const relevantTag = (name: string): string | null => {
    if (name === currentArchetype) return "Reads as today";
    if (name === targetArchetype) return "Should read as";
    return null;
  };

  const advance = (dir: 1 | -1) => setCurrent((c) => (c + dir + ORDER.length) % ORDER.length);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragStartX.current = e.clientX;
    stackRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current == null) return;
    const dx = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (Math.abs(dx) < 24) { advance(1); return; } // plain click/tap advances
    advance(dx < 0 ? 1 : -1);
  };

  return (
    <div>
      <div className="stack" ref={stackRef} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        {ORDER.map((name, i) => {
          const meta = ARCHETYPES[name];
          const rel = (i - current + ORDER.length) % ORDER.length;
          const tag = relevantTag(name);
          const style =
            rel === 0
              ? { transform: "translateY(0) scale(1)", opacity: 1, zIndex: 10 }
              : rel === 1
              ? { transform: "translateY(14px) scale(0.94)", opacity: 0.55, zIndex: 9 }
              : rel === 2
              ? { transform: "translateY(26px) scale(0.88)", opacity: 0.28, zIndex: 8 }
              : { transform: "translateY(30px) scale(0.85)", opacity: 0, zIndex: 1 };
          return (
            <div key={name} className={`a-card tint-${meta.tint}${tag ? " hl" : ""}`} style={style}>
              <div className="g-ic" style={{ background: meta.tint === "mint" ? "var(--mint)" : "var(--violet)" }}>
                <svg width="13" height="13" viewBox={meta.viewBox} fill="none">
                  <path d={meta.path} stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {tag && <div className="g-tag">{tag}</div>}
              <div className="g-name">The {name}</div>
              <div className="g-desc">{meta.essence}</div>
            </div>
          );
        })}
      </div>
      <div className="stack-dots">
        {ORDER.map((name, i) => (
          <span key={name} className={i === current ? "on" : ""} onClick={() => setCurrent(i)} />
        ))}
      </div>
    </div>
  );
}
