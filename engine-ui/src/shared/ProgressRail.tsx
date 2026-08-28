import { useEffect, useRef, useState } from "react";
import { color, font } from "../theme";

export type RailSection = { id: string; label: string };

// A fixed, left-edge scroll progress indicator — not a tab bar. It never
// changes the URL or swaps content; it only tracks and lets you jump
// between where you already are on one continuous page. Dots fill in as
// you pass each section, and the connecting line grows with overall scroll
// progress through the workspace.
export default function ProgressRail({ sections }: { sections: RailSection[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const [progress, setProgress] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const elements = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => Boolean(el));
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -60% 0px", threshold: 0 },
    );
    elements.forEach((el) => observerRef.current?.observe(el));

    const onScroll = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [sections]);

  const jumpTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div style={{ position: "fixed", left: 28, top: "50%", transform: "translateY(-50%)", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: 2, height: sections.length * 56, background: "rgba(11,28,72,0.08)", borderRadius: 1 }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: `${progress * 100}%`, background: "linear-gradient(180deg,#186132,#14D571)", borderRadius: 1, transition: "height 0.15s linear" }} />
        {sections.map((s, i) => {
          const isActive = s.id === activeId;
          return (
            <button
              key={s.id}
              onClick={() => jumpTo(s.id)}
              aria-label={s.label}
              style={{
                position: "absolute",
                left: "50%",
                top: `${(i / Math.max(1, sections.length - 1)) * 100}%`,
                transform: "translate(-50%, -50%)",
                width: isActive ? 12 : 8,
                height: isActive ? 12 : 8,
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                background: isActive ? color.violet : "rgba(11,28,72,0.18)",
                boxShadow: isActive ? "0 0 0 4px rgba(91,97,244,0.15)" : "none",
                transition: "all 0.2s ease",
                padding: 0,
              }}
              onMouseEnter={(e) => {
                const label = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (label) label.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                const label = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (label) label.style.opacity = "0";
              }}
            />
          );
        })}
      </div>
      {sections.map((s, i) => (
        <span
          key={`label-${s.id}`}
          style={{
            position: "fixed",
            left: 44,
            top: `calc(50% - ${sections.length * 28}px + ${(i / Math.max(1, sections.length - 1)) * sections.length * 56}px)`,
            transform: "translateY(-50%)",
            fontFamily: font.body,
            fontSize: 11,
            fontWeight: 600,
            color: color.navy,
            background: "rgba(255,255,255,0.9)",
            padding: "3px 10px",
            borderRadius: 6,
            whiteSpace: "nowrap",
            opacity: 0,
            pointerEvents: "none",
            transition: "opacity 0.15s ease",
            boxShadow: "0 2px 8px rgba(11,28,72,0.1)",
          }}
        >
          {s.label}
        </span>
      ))}
    </div>
  );
}
