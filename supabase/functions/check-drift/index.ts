import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CHECK-DRIFT — Layer 3 (Pulse Pro drift monitor) ───
// Two ways in:
// 1. Reactive — called by the embed script with `fingerprints` when
//    serve-variant flags driftCheckDue. Cheap path (the common case): diff
//    the reported per-zone fingerprints against the stored baseline, update
//    the baseline, return. Expensive path (throttled to once per 6h per
//    audit): re-fetch the live URL server-side, re-run the journey
//    diagnosis, and log a drift_events row for any journey stage whose
//    severity rose.
// 2. Scheduled — called by pg_cron (see the check_drift_scheduled_sweep job)
//    with just {auditId, domain}, no fingerprints. Skips the fingerprint
//    gate entirely and always takes the expensive path (still respecting the
//    6h throttle), so a site with zero visitor traffic still gets checked —
//    drift detection isn't purely reactive to traffic.
//
// Every expensive-path run appends its journey_breaks to
// archetype_consistency_scores rather than only reading it — this is what
// gives an audit a real, accumulating drift history instead of a single
// fixed baseline. When a stage's severity rises, a second Claude call reasons
// over that stage's full historical severity sequence (not just this run vs.
// the last one) to judge whether it's a one-off dip or a repeated/escalating
// regression, and that judgment — not a bare number — is what lands in
// drift_events.
//
// The journey diagnosis here uses the exact same shape as run-audit
// (element/whats_happening/what_should_happen/reason/fix/ai_prompt) so a
// drift-run journey break and an original-audit journey break are
// interchangeable rows in archetype_consistency_scores. A `severity` field
// is generated alongside them purely as an internal signal for this file's
// own regression comparison — the product surfaces the AI's narrative
// reasoning about drift (see assessRegression below), never a bare severity
// number.
//
// Detect + log + surface only: suggested_variant_id is always left null.
// No autonomous Claude call generates a fix — that stays the existing
// manual "Generate" click in the workspace.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

// ─── CONFIG ───
const CANDIDATE_THRESHOLD = 0.2; // >20% word-count change on a zone = candidate
const FULL_CHECK_THROTTLE_MS = 6 * 60 * 60 * 1000; // 6 hours

// ─── TYPES ───
type Industry = "saas" | "ecommerce" | "portfolio" | "healthcare" | "fintech" | "service";
type Archetype = "Hero" | "Sage" | "Outlaw" | "Caregiver" | "Creator" | "Ruler";
type JourneyStage = "arrival" | "understanding" | "trust-building" | "decision" | "action";
const JOURNEY_STAGES: JourneyStage[] = ["arrival", "understanding", "trust-building", "decision", "action"];

interface JourneyBreak {
  journey_stage: JourneyStage;
  element: string;
  whats_happening: string;
  what_should_happen: string;
  reason: string;
  fix: string;
  ai_prompt: string;
  severity: number;
}
interface JourneyDiagnosis {
  narrative_verdict: string;
  journey_breaks: JourneyBreak[];
}

interface ZoneFingerprint {
  wordCount: number;
  textLength: number;
}

interface CheckDriftPayload {
  auditId?: string;
  domain?: string;
  fingerprints?: Record<string, ZoneFingerprint>;
}

interface PageSignals {
  domain: string;
  title: string | null;
  metaDescription: string | null;
  h1Text: string;
  h2Texts: string[];
  navLinks: string[];
  ctaTexts: string[];
  paragraphTexts: string[];
  testimonialTexts: string[];
  trustLogoLabels: string[];
  pricingTiers: { name: string; price: string }[];
  imagesCount: number;
  hasForm: boolean;
  bodyWordCount: number;
  youWeRatio: number;
}

// ─── HELPERS (ported from run-audit — same signal extraction, kept in sync
// so a drift re-check and the original diagnosis reason from the same data). ───
function cleanText(input: string | null | undefined): string {
  return (input ?? "").replace(/\s+/g, " ").trim();
}
function countWordOccurrences(text: string, words: string[]): number {
  return words.reduce((sum, word) => sum + (text.match(new RegExp(`\\b${word}\\b`, "gi"))?.length ?? 0), 0);
}
function hasAny(text: string, patterns: string[]): boolean {
  return patterns.some((p) => text.includes(p));
}

async function readStreamedText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          text += event.delta.text;
        }
      } catch {
        // ignore malformed SSE lines
      }
    }
  }
  return text;
}

async function fetchHtml(url: string): Promise<{ success: true; html: string } | { success: false; error: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "UXpactBot/1.0", Accept: "text/html,application/xhtml+xml" },
    });
    const html = await response.text();
    return { success: true, html };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return { success: false, error: "Request timed out" };
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch URL" };
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractSignals(doc: Document, domain: string): PageSignals {
  const title = cleanText(doc.querySelector("title")?.textContent) || null;
  const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute("content") ?? null;
  const h1Text = cleanText(doc.querySelector("h1")?.textContent);
  const h2Texts = Array.from(doc.querySelectorAll("h2")).map((h) => cleanText(h.textContent)).filter(Boolean).slice(0, 8);

  const headerEl = doc.querySelector("header");
  const navEl = headerEl?.querySelector("nav") ?? doc.querySelector("nav");
  const navLinks = navEl ? Array.from(navEl.querySelectorAll("a")).map((a) => cleanText(a.textContent)).filter(Boolean).slice(0, 10) : [];

  const ctaTexts = Array.from(doc.querySelectorAll("a, button"))
    .map((el) => cleanText(el.textContent))
    .filter((t) => t.length > 1 && t.length < 40)
    .slice(0, 15);

  const paragraphTexts = Array.from(doc.querySelectorAll("p")).map((p) => cleanText(p.textContent)).filter((p) => p.length > 15).slice(0, 8);

  const testimonialTexts = (() => {
    const nodes = Array.from(doc.querySelectorAll("blockquote, [class*='testimonial' i], [class*='review' i]"));
    return nodes.map((n) => cleanText(n.textContent).slice(0, 220)).filter((t) => t.length > 15).slice(0, 5);
  })();

  const trustLogoLabels = Array.from(doc.querySelectorAll("img"))
    .filter((img) => /logo|client|partner|brand/i.test(`${img.getAttribute("src") ?? ""} ${img.getAttribute("alt") ?? ""} ${img.getAttribute("class") ?? ""}`))
    .map((img) => cleanText(img.getAttribute("alt")))
    .filter(Boolean)
    .slice(0, 6);

  const pricingTiers = (() => {
    const priceRegex = /[£$€]\s?\d[\d,.]*/;
    const nodes = Array.from(doc.querySelectorAll("[class*='pric' i], [class*='plan' i], [class*='tier' i]"));
    const tiers: { name: string; price: string }[] = [];
    for (const el of nodes) {
      const match = el.textContent?.match(priceRegex);
      if (!match) continue;
      const heading = el.querySelector("h1, h2, h3, h4, [class*='name' i], [class*='title' i]");
      const name = cleanText(heading?.textContent) || cleanText(el.textContent).slice(0, 24);
      if (!name || tiers.some((t) => t.name === name)) continue;
      tiers.push({ name, price: match[0] });
      if (tiers.length >= 4) break;
    }
    return tiers;
  })();

  const bodyText = cleanText(doc.body?.textContent ?? "");
  const words = bodyText.length > 0 ? bodyText.split(/\s+/) : [];
  const youCount = countWordOccurrences(bodyText, ["you", "your", "yours"]);
  const weCount = countWordOccurrences(bodyText, ["we", "our", "us"]);

  return {
    domain,
    title,
    metaDescription,
    h1Text,
    h2Texts,
    navLinks,
    ctaTexts,
    paragraphTexts,
    testimonialTexts,
    trustLogoLabels,
    pricingTiers,
    imagesCount: doc.querySelectorAll("img").length,
    hasForm: doc.querySelectorAll("form").length > 0,
    bodyWordCount: words.length,
    youWeRatio: weCount === 0 ? (youCount > 0 ? 99 : 0) : youCount / weCount,
  };
}

function inferCurrentArchetype(signals: PageSignals): Archetype {
  const scores: Record<Archetype, number> = { Hero: 0, Sage: 0, Outlaw: 0, Caregiver: 0, Creator: 0, Ruler: 0 };
  if (signals.youWeRatio >= 4) { scores.Hero += 2; scores.Caregiver += 1; }
  else if (signals.youWeRatio >= 2) scores.Hero += 1;
  else if (signals.youWeRatio < 1) { scores.Ruler += 1; scores.Sage += 1; }

  const ctaText = signals.ctaTexts.join(" ").toLowerCase();
  const verbCounts: [Archetype, number][] = [
    ["Hero", countWordOccurrences(ctaText, ["get", "start", "fix", "build", "boost", "grow", "save", "win", "try"])],
    ["Sage", countWordOccurrences(ctaText, ["learn", "explore", "read", "discover"])],
    ["Ruler", countWordOccurrences(ctaText, ["apply", "request", "inquire"])],
    ["Caregiver", countWordOccurrences(ctaText, ["talk", "support", "join", "chat", "connect"])],
  ];
  const topVerb = verbCounts.sort((a, b) => b[1] - a[1])[0];
  if (topVerb[1] > 0) scores[topVerb[0]] += 2;

  if (signals.bodyWordCount > 800) scores.Sage += 2;
  else if (signals.bodyWordCount < 300) { scores.Hero += 1; scores.Outlaw += 1; }

  const headingText = `${signals.h1Text} ${signals.h2Texts.join(" ")}`.toLowerCase();
  if (hasAny(headingText, ["transform", "results", "faster", "grow", "boost", "win"])) scores.Hero += 2;
  if (hasAny(headingText, ["research", "proven", "methodology", "expert", "insight"])) scores.Sage += 2;
  if (hasAny(headingText, ["stop", "ditch", "break", "rules", "different"])) scores.Outlaw += 2;
  if (hasAny(headingText, ["support", "help", "care", "together", "safe", "guide"])) scores.Caregiver += 2;
  if (hasAny(headingText, ["premium", "exclusive", "leading", "definitive", "elite", "authority"])) scores.Ruler += 2;
  if (hasAny(headingText, ["craft", "design", "create", "portfolio", "studio"])) scores.Creator += 2;
  if (signals.trustLogoLabels.length >= 3) scores.Ruler += 1;
  if (signals.testimonialTexts.length > 0) scores.Caregiver += 1;

  const ranked = (Object.entries(scores) as [Archetype, number][]).sort((a, b) => b[1] - a[1]);
  return ranked[0][1] > 0 ? ranked[0][0] : "Hero";
}

// ─── CLAUDE API — UX JOURNEY DIAGNOSIS (same shape run-audit uses, plus an
// internal-only severity field used purely for this file's drift comparison). ───
const JOURNEY_SYSTEM_PROMPT =
  "You are UXpact's UX intelligence engine, re-checking a site you've diagnosed before. You read the site the way a " +
  "visitor would and tell the story of what actually happens to them. The site's story is the visitor's journey — " +
  "arrival, understanding, trust-building, decision, action — not a brand-personality label. Archetype (current vs " +
  "target) is only the lens for explaining WHY a stage breaks down, never the diagnosis itself. Never say a site " +
  "'is' or 'should be' an archetype as the verdict — describe where and why the visitor's journey breaks down. " +
  "Every journey_break must be anchored to exactly one of the five journey stages, name what's happening, what " +
  "should be happening instead, and why. For each break also write a concrete recommended fix, a ready-to-use AI " +
  "prompt someone could paste into an AI coding tool to implement that fix, and a severity from 1 (minor) to 5 " +
  "(critical) reflecting how badly this break hurts conversion right now — severity is an internal signal used only " +
  "to detect whether things have gotten worse since the last check, never shown to the end user as a score. Ground " +
  "everything in the real content given — never invent facts about the page. Never use jargon.";

const JOURNEY_DIAGNOSIS_SCHEMA = {
  type: "object",
  properties: {
    narrative_verdict: { type: "string", description: "2-3 sentences telling the story of what happens to a visitor on this page." },
    journey_breaks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          journey_stage: { type: "string", enum: JOURNEY_STAGES },
          element: { type: "string", description: "The specific page element this break is about, e.g. 'Hero headline' or 'Primary CTA'." },
          whats_happening: { type: "string" },
          what_should_happen: { type: "string" },
          reason: { type: "string" },
          fix: { type: "string", description: "A concrete recommended fix." },
          ai_prompt: { type: "string", description: "A ready-to-use prompt for an AI coding tool to implement the fix on the real site." },
          severity: { type: "integer", description: "1 (minor) to 5 (critical) — internal only, never shown to the end user." },
        },
        required: ["journey_stage", "element", "whats_happening", "what_should_happen", "reason", "fix", "ai_prompt", "severity"],
        additionalProperties: false,
      },
    },
  },
  required: ["narrative_verdict", "journey_breaks"],
  additionalProperties: false,
};

function sanitizeJourneyBreaks(breaks: unknown): JourneyBreak[] {
  if (!Array.isArray(breaks)) return [];
  return breaks
    .filter((b): b is JourneyBreak => Boolean(b) && typeof b === "object" && JOURNEY_STAGES.includes((b as JourneyBreak).journey_stage) && typeof (b as JourneyBreak).severity === "number")
    .map((b) => ({ ...b, severity: Math.min(5, Math.max(1, Math.round(b.severity))) }));
}

async function diagnoseJourney(args: {
  signals: PageSignals;
  industry: Industry;
  goal: string;
  currentArchetype: Archetype;
  targetArchetype: Archetype;
}): Promise<JourneyDiagnosis | null> {
  if (!ANTHROPIC_API_KEY) {
    console.error("check-drift diagnoseJourney: ANTHROPIC_API_KEY is not set — skipping AI diagnosis.");
    return null;
  }
  const { signals, industry, goal, currentArchetype, targetArchetype } = args;
  const userPayload = {
    current_archetype: currentArchetype,
    target_archetype: targetArchetype,
    industry,
    goal,
    domain: signals.domain,
    title: signals.title,
    meta_description: signals.metaDescription,
    h1: signals.h1Text,
    h2s: signals.h2Texts,
    nav_links: signals.navLinks,
    cta_texts: signals.ctaTexts,
    paragraphs: signals.paragraphTexts,
    testimonials: signals.testimonialTexts,
    trust_logos: signals.trustLogoLabels,
    pricing_tiers: signals.pricingTiers,
    has_form: signals.hasForm,
    images_count: signals.imagesCount,
    body_word_count: signals.bodyWordCount,
    you_we_ratio: Number(signals.youWeRatio.toFixed(2)),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 4000,
        stream: true,
        output_config: { effort: "medium", format: { type: "json_schema", schema: JOURNEY_DIAGNOSIS_SCHEMA } },
        system: [{ type: "text", text: JOURNEY_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: JSON.stringify(userPayload) }],
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`check-drift diagnoseJourney: Claude API returned ${response.status}: ${body.slice(0, 1000)}`);
      return null;
    }
    const text = await readStreamedText(response);
    if (!text) {
      console.error("check-drift diagnoseJourney: no text content in streamed Claude response");
      return null;
    }
    const parsed = JSON.parse(text) as { narrative_verdict: string; journey_breaks: unknown };
    return { narrative_verdict: parsed.narrative_verdict, journey_breaks: sanitizeJourneyBreaks(parsed.journey_breaks) };
  } catch (error) {
    console.error("check-drift diagnoseJourney: request failed", error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── CLAUDE API — REGRESSION REASONING ACROSS FULL DRIFT HISTORY ───
const REGRESSION_SYSTEM_PROMPT =
  "You are a UX regression analyst. You are given the full historical sequence of severity readings (1-5) for a single " +
  "journey stage on one site, oldest first, plus this run's new reading. Decide whether the new rise is a one-off dip — " +
  "noise, a temporary A/B test, a single bad snapshot — or a repeated/escalating regression worth escalating differently: " +
  "severity climbing across multiple readings, or the same or worse severity recurring after it was previously flagged. " +
  "Ground your judgment in the actual sequence given, not assumptions.";

const REGRESSION_SCHEMA = {
  type: "object",
  properties: {
    regression_type: { type: "string", enum: ["one_off", "repeated"] },
    reasoning: { type: "string", description: "One or two sentences, citing the specific historical readings that justify the judgment." },
  },
  required: ["regression_type", "reasoning"],
  additionalProperties: false,
};

interface RegressionAssessment {
  regression_type: "one_off" | "repeated";
  reasoning: string;
}

async function assessRegression(args: {
  journeyStage: JourneyStage;
  element: string;
  history: { severity: number; checkedAt: string }[];
  newSeverity: number;
}): Promise<RegressionAssessment | null> {
  if (!ANTHROPIC_API_KEY) {
    console.error("check-drift assessRegression: ANTHROPIC_API_KEY is not set — skipping regression reasoning.");
    return null;
  }
  const userPayload = {
    journey_stage: args.journeyStage,
    element: args.element,
    historical_severities_oldest_first: args.history.map((h) => ({ severity: h.severity, checked_at: h.checkedAt })),
    new_severity: args.newSeverity,
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 800,
        stream: true,
        output_config: { effort: "medium", format: { type: "json_schema", schema: REGRESSION_SCHEMA } },
        system: [{ type: "text", text: REGRESSION_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: JSON.stringify(userPayload) }],
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`check-drift assessRegression: Claude API returned ${response.status}: ${body.slice(0, 500)}`);
      return null;
    }
    const text = await readStreamedText(response);
    if (!text) return null;
    const parsed = JSON.parse(text) as RegressionAssessment;
    if (parsed.regression_type !== "one_off" && parsed.regression_type !== "repeated") return null;
    return parsed;
  } catch (error) {
    console.error("check-drift assessRegression: request failed", error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── FINGERPRINT DIFF ───
function hasCandidateZone(incoming: Record<string, ZoneFingerprint>, baseline: Record<string, ZoneFingerprint> | null): boolean {
  if (!baseline) return false; // first-ever report — nothing to diff against yet
  for (const [zone, current] of Object.entries(incoming)) {
    const prior = baseline[zone];
    if (!prior || prior.wordCount === 0) continue;
    const change = Math.abs(current.wordCount - prior.wordCount) / prior.wordCount;
    if (change > CANDIDATE_THRESHOLD) return true;
  }
  return false;
}

// ─── MAIN HANDLER ───
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  if (req.method !== "POST") return jsonResponse({ checked: false }, 405);
  if (!supabase) return jsonResponse({ checked: false }, 200);

  let payload: CheckDriftPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ checked: false }, 400);
  }

  const auditId = typeof payload.auditId === "string" ? payload.auditId : null;
  const domain = typeof payload.domain === "string" ? payload.domain : null;
  const fingerprints = payload.fingerprints && typeof payload.fingerprints === "object" ? payload.fingerprints : null;
  if (!auditId) return jsonResponse({ checked: false }, 400);

  // No fingerprints = a scheduled (pg_cron) sweep, not a reactive visitor-triggered call.
  // Skip the fingerprint-candidate gate entirely — a site with zero traffic still gets checked.
  const scheduled = !fingerprints;

  const { data: snapshot } = await supabase
    .from("site_snapshots")
    .select("zone_fingerprints, last_full_check_at")
    .eq("audit_id", auditId)
    .maybeSingle();

  const throttled = Boolean(snapshot?.last_full_check_at) && Date.now() - new Date(snapshot!.last_full_check_at as string).getTime() < FULL_CHECK_THROTTLE_MS;

  if (!scheduled) {
    const baseline = (snapshot?.zone_fingerprints as Record<string, ZoneFingerprint> | null) ?? null;
    const candidate = hasCandidateZone(fingerprints!, baseline);

    // Cheap path: no candidate change, or a candidate exists but we're still throttled.
    // Either way, just refresh the baseline fingerprints and move on.
    if (!candidate || throttled) {
      await supabase.from("site_snapshots").upsert(
        { audit_id: auditId, domain, zone_fingerprints: fingerprints, last_checked_at: new Date().toISOString() },
        { onConflict: "audit_id" },
      );
      return jsonResponse({ checked: true, escalated: false }, 200);
    }
  } else if (throttled) {
    // Scheduled sweep landed inside an already-fresh window (e.g. a visitor triggered
    // the expensive path recently) — nothing new to do.
    return jsonResponse({ checked: true, escalated: false, scheduled: true, skipped: "throttled" }, 200);
  }

  // Expensive path: re-fetch the live URL, re-run the journey diagnosis, diff severities
  // against this audit's full stored history, and reason about any regression found.
  const { data: audit } = await supabase
    .from("audits")
    .select("url, domain, industry, goal, target_archetype")
    .eq("id", auditId)
    .maybeSingle();

  let driftEventsLogged = 0;
  if (audit?.url) {
    const fetchResult = await fetchHtml(audit.url);
    if (fetchResult.success) {
      const doc = new DOMParser().parseFromString(fetchResult.html, "text/html");
      if (doc) {
        const signals = extractSignals(doc, (audit.domain as string) ?? domain ?? "");
        const currentArchetype = inferCurrentArchetype(signals);
        const targetArchetype = (audit.target_archetype as Archetype) ?? "Hero";
        const diagnosis = await diagnoseJourney({
          signals,
          industry: (audit.industry as Industry) ?? "saas",
          goal: audit.goal ?? "",
          currentArchetype,
          targetArchetype,
        });

        if (diagnosis) {
          // Full prior history per stage, oldest first — this is what makes the
          // regression call "reason across history" rather than diff a single number.
          const { data: storedBreaks } = await supabase
            .from("archetype_consistency_scores")
            .select("journey_stage, conflict_severity, created_at")
            .eq("audit_id", auditId)
            .order("created_at", { ascending: true });

          const historyByStage = new Map<JourneyStage, { severity: number; checkedAt: string }[]>();
          for (const row of storedBreaks ?? []) {
            const stage = row.journey_stage as JourneyStage;
            const list = historyByStage.get(stage) ?? [];
            list.push({ severity: row.conflict_severity ?? 0, checkedAt: row.created_at as string });
            historyByStage.set(stage, list);
          }
          const priorMaxByStage = new Map<JourneyStage, number>();
          for (const [stage, list] of historyByStage.entries()) {
            priorMaxByStage.set(stage, Math.max(0, ...list.map((h) => h.severity)));
          }

          // Persist this run's readings so the NEXT check has one more history point —
          // an audit's drift history accumulates across every expensive-path run, not
          // just the original diagnosis. Same column shape run-audit writes.
          if (diagnosis.journey_breaks.length > 0) {
            const historyRows = diagnosis.journey_breaks.map((b) => ({
              audit_id: auditId,
              narrative_verdict: diagnosis.narrative_verdict,
              current_archetype: currentArchetype,
              target_archetype: targetArchetype,
              journey_stage: b.journey_stage,
              element: b.element,
              current_archetype_signal: b.whats_happening,
              what_should_happen: b.what_should_happen,
              conflict_severity: b.severity,
              reason: b.reason,
              fix: b.fix,
              ai_prompt: b.ai_prompt,
            }));
            const { error: historyError } = await supabase.from("archetype_consistency_scores").insert(historyRows);
            if (historyError) console.error("check-drift: failed to append drift history:", historyError.message);
          }

          const newMaxByStage = new Map<JourneyStage, JourneyBreak>();
          for (const brk of diagnosis.journey_breaks) {
            const existing = newMaxByStage.get(brk.journey_stage);
            if (!existing || brk.severity > existing.severity) newMaxByStage.set(brk.journey_stage, brk);
          }

          const eventsToInsert: Record<string, unknown>[] = [];
          for (const [stage, brk] of newMaxByStage.entries()) {
            const priorSeverity = priorMaxByStage.get(stage) ?? 0;
            const delta = brk.severity - priorSeverity;
            if (delta < 1) continue;

            const history = historyByStage.get(stage) ?? [];
            const assessment = await assessRegression({
              journeyStage: stage,
              element: brk.element,
              history,
              newSeverity: brk.severity,
            });

            eventsToInsert.push({
              audit_id: auditId,
              domain,
              element: brk.element,
              severity_delta: delta,
              suggested_variant_id: null,
              regression_type: assessment?.regression_type ?? null,
              reasoning: assessment?.reasoning ?? null,
            });
            if (!assessment) {
              console.error(`check-drift: regression reasoning failed for stage "${stage}" on audit ${auditId} — logging the drift event without a regression_type.`);
            }
          }

          if (eventsToInsert.length > 0) {
            const { error: insertError } = await supabase.from("drift_events").insert(eventsToInsert);
            if (!insertError) driftEventsLogged = eventsToInsert.length;
            else console.error("check-drift: failed to insert drift_events:", insertError.message);
          }
        } else {
          console.error(`check-drift: journey diagnosis failed for audit ${auditId} (${audit.url}) — see diagnoseJourney logs above.`);
        }
      }
    } else {
      console.error(`check-drift: failed to re-fetch ${audit.url} for scheduled/expensive drift check:`, fetchResult.error);
    }
  }

  const now = new Date().toISOString();
  await supabase.from("site_snapshots").upsert(
    {
      audit_id: auditId,
      domain,
      zone_fingerprints: fingerprints ?? (snapshot?.zone_fingerprints as Record<string, ZoneFingerprint> | null) ?? {},
      last_checked_at: now,
      last_full_check_at: now,
    },
    { onConflict: "audit_id" },
  );

  return jsonResponse({ checked: true, escalated: true, scheduled, driftEventsLogged }, 200);
});
