import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";

// Scroll-driven reveal: children fade/slide up the first time they cross
// into the viewport. This is the workspace's core "sticky on scroll" feel —
// content arrives as you move through the page rather than sitting static.
export default function Reveal({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal${inView ? " in-view" : ""}`} style={{ animationDelay: `${delay}s`, ...style }}>
      {children}
    </div>
  );
}
