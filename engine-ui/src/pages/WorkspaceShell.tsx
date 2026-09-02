// ─── WORKSPACE SHELL ────────────────────────────────────────────────────
// The persistent dark-theme frame around all five top-level destinations —
// brand corner, floating dock nav, crossfade page transition — ported from
// the approved visual-direction mockup (docs/adr/002). Each destination is
// a real route (App.tsx swaps this component's `destination` prop on
// navigation), not a scroll anchor — the shell itself owns no business data
// beyond the lightweight site-identity/live badges in the header corner,
// so each page underneath still fetches its own data by audit_id
// independently.
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { getSupabase } from "../lib/supabase";
import { FONT_LINK_HREF, KEYFRAMES } from "../lib/workspace-shared";
import type { Destination } from "../lib/destinations";
import BottomNav from "../components/BottomNav";
import Diagnosis from "./Diagnosis";
import Blueprint from "./Blueprint";
import VisionPro from "./VisionPro";
import Pulse from "./Pulse";
import Premium from "./Premium";
import "../styles/workspace-dark.css";

const PAGES: Record<Destination, ComponentType<{ auditId: string }>> = {
  diagnosis: Diagnosis,
  blueprint: Blueprint,
  "vision-pro": VisionPro,
  pulse: Pulse,
  premium: Premium,
};

// Wide pages (Blueprint's two-column canvas, Vision Pro's rows, Pulse) need
// more than the mockup's 760px Story column.
const WIDE_PAGES = new Set<Destination>(["blueprint", "vision-pro", "pulse", "premium"]);

// Mounts fresh on every destination change (parent uses key={destination})
// and replicates the mockup's .page-view -> .page-view.shown crossfade via
// a double rAF so the transition actually runs instead of snapping in.
function PageTransition({ wide, children }: { wide: boolean; children: ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setShown(true)); });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, []);
  return <section className={`page-view${wide ? " wide" : ""}${shown ? " shown" : ""}`}>{children}</section>;
}

export default function WorkspaceShell({ auditId, destination }: { auditId: string; destination: Destination }) {
  const [domain, setDomain] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadHeader = async () => {
      const supabase = getSupabase();
      const [{ data: auditRows }, { data: activeVariants }] = await Promise.all([
        supabase.from("audits").select("domain").eq("id", auditId),
        supabase.from("deployed_variants").select("id").eq("audit_id", auditId).eq("is_active", true),
      ]);
      if (cancelled) return;
      setDomain(auditRows?.[0]?.domain ?? null);
      setIsLive((activeVariants ?? []).length > 0);
    };
    void loadHeader();
    return () => { cancelled = true; };
  }, [auditId]);

  const Page = PAGES[destination];

  return (
    <div className="workspace-frame">
      <link href={FONT_LINK_HREF} rel="stylesheet" />
      <style>{KEYFRAMES}</style>

      <div className="brand-corner">
        <div className="brand-mark">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="9.5" stroke="#fff" strokeWidth="2" />
          </svg>
        </div>
        <span className="brand-name">UXpact</span>
      </div>

      {(domain || isLive) && (
        <div className="status-corner">
          {domain && <span className="status-pill mono">{domain}</span>}
          {isLive && (
            <span className="status-pill live">
              <span className="dt" />Live
            </span>
          )}
        </div>
      )}

      <div className="page-scroll">
        <PageTransition wide={WIDE_PAGES.has(destination)} key={destination}>
          <Page auditId={auditId} />
        </PageTransition>
      </div>

      <BottomNav auditId={auditId} current={destination} />
    </div>
  );
}
