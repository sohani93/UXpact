// ─── WORKSPACE SHELL ────────────────────────────────────────────────────
// The persistent frame around all five top-level destinations: brand header
// + bottom nav. Each destination is a real route (App.tsx swaps this
// component's `destination` prop on navigation), not a scroll anchor — the
// shell itself owns no business data beyond the lightweight site-identity
// line in the header, so each page underneath fetches its own data by
// audit_id independently.
import { useEffect, useState, type ComponentType } from "react";
import { getSupabase } from "../lib/supabase";
import { C, FONT_LINK_HREF, KEYFRAMES } from "../lib/workspace-shared";
import type { Destination } from "../lib/destinations";
import BottomNav from "../components/BottomNav";
import Diagnosis from "./Diagnosis";
import Blueprint from "./Blueprint";
import VisionPro from "./VisionPro";
import Pulse from "./Pulse";
import Premium from "./Premium";

const PAGES: Record<Destination, ComponentType<{ auditId: string }>> = {
  diagnosis: Diagnosis,
  blueprint: Blueprint,
  "vision-pro": VisionPro,
  pulse: Pulse,
  premium: Premium,
};

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
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Space Grotesk',sans-serif", position: "relative" }}>
      <link href={FONT_LINK_HREF} rel="stylesheet" />
      <style>{KEYFRAMES}</style>

      <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#186132,#14D571)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(20,140,89,0.2)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" /></svg>
          </div>
          <span style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 16, fontWeight: 700, color: C.navy }}>UXpact</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {domain && (
            <div style={{ background: "#D1FAE5", color: C.navy, padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", whiteSpace: "nowrap" }}>{domain}</div>
          )}
          {isLive && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 6, background: "rgba(20,140,89,0.1)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.emerald }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.emerald }}>Live</span>
            </div>
          )}
        </div>
      </div>

      <div className="fade-in" key={destination} style={{ paddingBottom: 108 }}>
        <Page auditId={auditId} />
      </div>

      <BottomNav auditId={auditId} current={destination} />
    </div>
  );
}
