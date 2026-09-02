// ─── WORKSPACE SHARED ───────────────────────────────────────────────────
// Constants, style tokens, and small pure helpers shared across the five
// top-level workspace routes (Diagnosis, Blueprint, Vision Pro, Pulse,
// Premium) plus the persistent bottom nav. Each route still fetches its own
// data independently by audit_id — this file only avoids re-declaring the
// same brand tokens / journey-stage vocabulary / endpoint URLs five times.
import { getSupabase } from "./supabase";
import type { JourneyBreak } from "./ui-types";

// Dark workspace palette — matches the CSS custom properties defined in
// styles/workspace-dark.css 1:1 (kept here too as plain hex/rgba strings for
// the handful of spots, like inline SVG stroke attrs, that need a literal
// value rather than a var()). Per ADR 002 this is the mockup's palette, not
// spec v3's light "Design system" list.
export const C = {
  bg: "#060509",
  navy: "#F3F1FA", // primary ink on dark canvas — name kept for call-site compat
  forest: "#1F8C4C",
  emerald: "#14D571",
  mint: "#14D571",
  violet: "#7B7FFF",
  violetDeep: "#4A3FBF",
  muted: "#B7B2CC",
  dim: "#79749A",
  border: "rgba(255,255,255,0.09)",
  danger: "#D9564C",
} as const;

// Legacy light "glass" panel style — superseded by the workspace-dark.css
// classes for the five workspace routes, kept only in case a call site still
// spreads it before this rebuild is fully ported.
export const glass = {
  background: "var(--surface)",
  borderRadius: 14,
  border: "1px solid var(--line)",
} as const;

export const KEYFRAMES = `
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes chipPop{0%{transform:scale(0.8)}60%{transform:scale(1.12)}100%{transform:scale(1.05)}}
@keyframes spin{to{transform:rotate(360deg)}}
.fade-in{animation:fadeIn 0.4s ease both}
.fade-up{animation:fadeUp 0.4s ease both}
`;

// Same Google Fonts import the approved mockup uses: Unbounded (headings /
// CTAs), Space Grotesk (body), Space Mono (labels, mono UI text — URLs,
// eyebrows, embed snippets). Loaded only inside WorkspaceShell so it never
// touches EngineInput/LoadingState's existing light-theme pages.
export const FONT_LINK_HREF =
  "https://fonts.googleapis.com/css2?family=Unbounded:wght@500;680;700&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap";

export const JOURNEY_STAGE_ORDER = ["arrival", "understanding", "trust-building", "decision", "action"] as const;
export const JOURNEY_STAGE_LABELS: Record<string, string> = {
  arrival: "Arrival",
  understanding: "Understanding",
  "trust-building": "Trust-building",
  decision: "Decision",
  action: "Action",
};

export const ARCHETYPES = ["Hero", "Sage", "Outlaw", "Caregiver", "Creator", "Ruler"] as const;
export const DEFAULT_SECTION_ORDER = ["hero", "features", "social", "pricing", "cta2"];
export const ZONE_LABELS: Record<string, string> = {
  nav: "Nav", hero: "Hero", features: "Features", social: "Customers", pricing: "Pricing", cta2: "Bottom CTA",
};
const JOURNEY_STAGE_TO_ZONE: Record<string, string> = {
  arrival: "hero", understanding: "features", "trust-building": "social", decision: "pricing", action: "cta2",
};

export function zoneForJourneyBreak(jb: { element?: string; journeyStage?: string }): string {
  const text = (jb.element ?? "").toLowerCase();
  if (/testimonial|trust|social proof|review|logo/.test(text)) return "social";
  if (/pricing|price|plan|cost/.test(text)) return "pricing";
  if (/\bcta\b|bottom cta|call.to.action|objection/.test(text)) return "cta2";
  if (/hero|headline|\bh1\b/.test(text)) return "hero";
  if (/feature/.test(text)) return "features";
  return JOURNEY_STAGE_TO_ZONE[jb.journeyStage ?? ""] ?? "features";
}

export function seedCopySelectionsFromJourney(journeyBreaks: JourneyBreak[]): Record<string, string> {
  const seeded: Record<string, string> = {};
  journeyBreaks.forEach((jb) => {
    const zone = zoneForJourneyBreak(jb);
    if (!seeded[zone]) seeded[zone] = jb.fix || jb.reason || "Address this journey break.";
  });
  DEFAULT_SECTION_ORDER.forEach((zone) => {
    if (!seeded[zone]) seeded[zone] = "Keep this section's current copy.";
  });
  return seeded;
}

// Maps archetype_consistency_scores rows (one per journey break) to the
// JourneyBreak shape the UI works with everywhere.
export function mapJourneyRows(rows: any[] | null | undefined): JourneyBreak[] {
  return (rows ?? []).map((j: any) => ({
    journeyStage: j.journey_stage,
    element: j.element,
    whatsHappening: j.current_archetype_signal,
    whatShouldHappen: j.what_should_happen,
    reason: j.reason,
    fix: j.fix,
    aiPrompt: j.ai_prompt,
  }));
}

export function sortByJourneyStage<T extends { journeyStage: string }>(breaks: T[]): T[] {
  return [...breaks].sort(
    (a, b) => JOURNEY_STAGE_ORDER.indexOf(a.journeyStage as any) - JOURNEY_STAGE_ORDER.indexOf(b.journeyStage as any),
  );
}

export const embedSnippetFor = (auditId: string) =>
  `<script src="https://uxpact.pages.dev/pulse-pro.js" data-uxpact-audit="${auditId}" async></script>`;

export const GENERATE_VISION_ENDPOINT =
  import.meta.env.VITE_GENERATE_VISION_ENDPOINT ?? "https://oxminualycvnxofoevjs.supabase.co/functions/v1/generate-vision";
export const SELF_CHECK_VISION_ENDPOINT =
  import.meta.env.VITE_SELF_CHECK_VISION_ENDPOINT ?? "https://oxminualycvnxofoevjs.supabase.co/functions/v1/self-check-vision";
export const DEPLOY_VARIANT_ENDPOINT =
  import.meta.env.VITE_DEPLOY_VARIANT_ENDPOINT ?? "https://oxminualycvnxofoevjs.supabase.co/functions/v1/deploy-variant";

export const GENERATION_STEPS = [
  "Parsing your site's real structure…",
  "Reordering sections…",
  "Rewriting copy for the story…",
  "Checking the rebuild against your diagnosis…",
];

// Polls vision_generation_jobs until a generate-vision / self-check-vision
// job finishes — shared by Blueprint (first rebuild) and Vision Pro (added
// live test variants), both of which call through the same job queue.
export async function pollGenerationJob(jobId: string): Promise<{ html: string } | { error: string }> {
  const supabase = getSupabase();
  const start = Date.now();
  const MAX_WAIT_MS = 5 * 60 * 1000;
  while (Date.now() - start < MAX_WAIT_MS) {
    const { data: job, error } = await supabase.from("vision_generation_jobs").select("status, html, error_message").eq("id", jobId).single();
    if (error) return { error: error.message || "Lost track of the generation job. Try again." };
    if (job.status === "done") return { html: job.html };
    if (job.status === "error") return { error: job.error_message || "Generation failed. Try again." };
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return { error: "This step is taking longer than expected. Try again in a moment." };
}

// Runs the full generate → self-check chain, returning the final (or
// best-available) HTML. Shared by Blueprint's Restructured tab and Vision
// Pro's "add a live test variant" flow — both produce a self-checked
// rebuild the same way, they just do different things with it afterward.
export async function generateAndSelfCheck(params: {
  auditId: string;
  archetype: string;
  sectionOrder: string[];
  copySelections: Record<string, string>;
  rawHtml: string;
}): Promise<{ html: string } | { error: string }> {
  const { auditId, archetype, sectionOrder, copySelections, rawHtml } = params;
  const genResponse = await fetch(GENERATE_VISION_ENDPOINT, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auditId, archetype, sectionOrder, copySelections, rawHtml }),
  });
  const genJson = await genResponse.json();
  if (!genResponse.ok || genJson.error || !genJson.jobId) return { error: genJson.message || "Generation failed. Try again." };
  const draftResult = await pollGenerationJob(genJson.jobId);
  if ("error" in draftResult) return draftResult;

  const checkResponse = await fetch(SELF_CHECK_VISION_ENDPOINT, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auditId, draftHtml: draftResult.html }),
  });
  const checkJson = await checkResponse.json();
  if (!checkResponse.ok || checkJson.error || !checkJson.jobId) return { html: draftResult.html };
  const finalResult = await pollGenerationJob(checkJson.jobId);
  if ("error" in finalResult) return { html: draftResult.html };
  return { html: finalResult.html };
}

// Small domain/status pill used in each page's header row. Not a component
// (this file is plain .ts, shared by both .ts and .tsx consumers) — callers
// spread pillStyle(v) onto a <span>.
export function pillStyle(v: "green" | "violet") {
  const s = v === "green" ? { background: "#D1FAE5", color: C.navy } : { background: "#E0E7FF", color: C.navy };
  return { ...s, padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", whiteSpace: "nowrap" as const };
}
