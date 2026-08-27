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
// Duplicates a minimal slice of run-audit's metadata extraction and journey
// diagnosis logic rather than importing it — Edge Functions don't share a
// runtime, and this only needs the handful of fields diagnoseJourney() and
// inferCurrentArchetype() actually read, not the full 50-check engine.
//
// Detect + log + surface only: suggested_variant_id is always left null.
// No autonomous Claude call generates a fix — that stays the existing
// manual "Generate" click in Blueprint.

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
  current_archetype_signal: string;
  conflict_severity: number;
  reason: string;
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

// Only the fields inferCurrentArchetype() and diagnoseJourney() actually read —
// not the full PageMetadata shape run-audit builds for the 50-check engine.
interface MinimalMetadata {
  h1Text: string;
  paragraphExcerpt: string;
  metaDescription: string | null;
  ctas: { text: string }[];
  images: { src: string; alt: string | null }[];
  headingTexts: string[];
  bodyTextContent: string;
  bodyWordCount: number;
  youWeRatio: number;
}

// ─── HELPERS (duplicated from run-audit, kept minimal) ───
function cleanText(input: string | null | undefined): string {
  return (input ?? "").replace(/\s+/g, " ").trim();
}
function textOrNull(input: string | null | undefined): string | null {
  const cleaned = cleanText(input);
  return cleaned.length > 0 ? cleaned : null;
}
function countWordOccurrences(text: string, words: string[]): number {
  return words.reduce((sum, word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    return sum + (text.match(regex)?.length ?? 0);
  }, 0);
}
function hasAny(text: string, patterns: (string | RegExp)[]): boolean {
  return patterns.some((p) => (typeof p === "string" ? text.includes(p) : p.test(text)));
}

async function fetchHtml(url: string): Promise<{ success: true; html: string } | { success: false; error: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "UXpactAuditBot/0.1", Accept: "text/html,application/xhtml+xml" },
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

// ─── MINIMAL METADATA EXTRACTION ───
const CTA_TEXT_PATTERNS = ["get started", "start", "sign up", "try", "book", "contact", "buy", "subscribe", "learn more", "request", "demo", "free", "access", "download", "get my", "get your", "schedule", "claim"];
const NON_CTA_PATTERNS = ["sync", "connect", "import", "export", "settings", "filter", "search", "cancel", "close", "dismiss", "skip", "back", "next", "previous", "load more", "show more", "save your spot", "remind me", "notify me", "login", "log in", "sign in", "logout", "log out", "copy", "share", "print", "view all", "see all", "read more"];

function extractMinimalMetadata(doc: Document): MinimalMetadata {
  const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute("content") ?? null;
  const h1Text = textOrNull(doc.querySelector("h1")?.textContent) ?? "";
  const headingTexts = Array.from(doc.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((h) => cleanText(h.textContent));
  const paragraphExcerpt = cleanText(doc.querySelector("p")?.textContent ?? "");

  const ctas = Array.from(doc.querySelectorAll("a, button, input[type='button'], input[type='submit'], [role='button']"))
    .map((el) => ({ text: cleanText(el.textContent || el.getAttribute("value") || ""), tag: el.tagName.toLowerCase(), classes: (el.getAttribute("class") || "").trim() }))
    .filter((entry) => {
      const normalized = entry.text.toLowerCase();
      const classText = entry.classes.toLowerCase();
      if (!normalized || normalized.length < 2 || normalized.length > 60) return false;
      if (NON_CTA_PATTERNS.some((p) => normalized.includes(p))) return false;
      const hasCtaClass = classText.includes("cta") || classText.includes("btn") || classText.includes("button");
      const hasCtaText = CTA_TEXT_PATTERNS.some((pattern) => normalized.includes(pattern));
      if (entry.tag === "a") return hasCtaClass && hasCtaText;
      return hasCtaText || hasCtaClass;
    })
    .map((entry) => ({ text: entry.text }));

  const images = Array.from(doc.querySelectorAll("img")).map((img) => ({ src: img.getAttribute("src") ?? "", alt: img.getAttribute("alt") }));

  const bodyTextContent = cleanText(doc.body?.textContent ?? "");
  const words = bodyTextContent.length > 0 ? bodyTextContent.split(/\s+/) : [];
  const youCount = countWordOccurrences(bodyTextContent, ["you", "your", "yours"]);
  const weCount = countWordOccurrences(bodyTextContent, ["we", "our", "us"]);

  return {
    h1Text,
    paragraphExcerpt,
    metaDescription,
    ctas,
    images,
    headingTexts,
    bodyTextContent,
    bodyWordCount: words.length,
    youWeRatio: weCount === 0 ? (youCount > 0 ? 99 : 0) : youCount / weCount,
  };
}

// ─── ARCHETYPE INFERENCE (ported from run-audit, same signal set) ───
function inferCurrentArchetype(metadata: MinimalMetadata): Archetype {
  const scores: Record<Archetype, number> = { Hero: 0, Sage: 0, Outlaw: 0, Caregiver: 0, Creator: 0, Ruler: 0 };

  if (metadata.youWeRatio >= 4) { scores.Hero += 2; scores.Caregiver += 1; }
  else if (metadata.youWeRatio >= 2) { scores.Hero += 1; }
  else if (metadata.youWeRatio < 1) { scores.Ruler += 1; scores.Sage += 1; }

  const ctaText = metadata.ctas.map((c) => c.text.toLowerCase()).join(" ");
  const verbCounts: Record<Archetype, number> = {
    Hero: countWordOccurrences(ctaText, ["get", "start", "fix", "build", "boost", "grow", "save", "win", "try"]),
    Sage: countWordOccurrences(ctaText, ["learn", "explore", "read", "discover"]),
    Ruler: countWordOccurrences(ctaText, ["apply", "request", "inquire"]),
    Caregiver: countWordOccurrences(ctaText, ["talk", "support", "join", "chat", "connect"]),
    Outlaw: 0,
    Creator: 0,
  };
  const topVerbArchetype = (Object.entries(verbCounts) as [Archetype, number][]).sort((a, b) => b[1] - a[1])[0];
  if (topVerbArchetype[1] > 0) scores[topVerbArchetype[0]] += 2;

  const lowerBody = metadata.bodyTextContent.toLowerCase();
  if (hasAny(lowerBody, ["result", "increase", "reduc", "roi", "grew", "boost"])) scores.Hero += 1;
  if (hasAny(lowerBody, ["research", "study", "methodology", "proven", "certified"])) scores.Sage += 1;
  if (hasAny(lowerBody, ["award", "trusted by", "featured in", "partner"]) || metadata.images.filter((img) => /logo|client|partner|brand/i.test(img.src) || /logo|client|partner|brand/i.test(img.alt ?? "")).length >= 3) scores.Ruler += 1;
  if (hasAny(lowerBody, ["story", "journey", "together", "community", "care"])) scores.Caregiver += 1;

  if (metadata.bodyWordCount > 800) scores.Sage += 2;
  else if (metadata.bodyWordCount < 300) { scores.Hero += 1; scores.Outlaw += 1; }

  const headingText = metadata.headingTexts.join(" ").toLowerCase();
  if (hasAny(headingText, ["transform", "results", "faster", "grow", "boost", "win"])) scores.Hero += 2;
  if (hasAny(headingText, ["research", "proven", "methodology", "expert", "insight"])) scores.Sage += 2;
  if (hasAny(headingText, ["stop", "ditch", "break", "rules", "different"])) scores.Outlaw += 2;
  if (hasAny(headingText, ["support", "help", "care", "together", "safe", "guide"])) scores.Caregiver += 2;
  if (hasAny(headingText, ["premium", "exclusive", "leading", "definitive", "elite", "authority"])) scores.Ruler += 2;
  if (hasAny(headingText, ["craft", "design", "create", "portfolio", "studio"])) scores.Creator += 2;

  const ranked = (Object.entries(scores) as [Archetype, number][]).sort((a, b) => b[1] - a[1]);
  return ranked[0][1] > 0 ? ranked[0][0] : "Hero";
}

// ─── CLAUDE API — UX JOURNEY DIAGNOSIS (same prompt/schema run-audit uses) ───
const JOURNEY_SYSTEM_PROMPT = "You are a UX journey analyst. The site's story is the visitor's journey — arrival, understanding, trust-building, decision, action — not a brand-personality label. Archetype (current vs target) is only the lens for explaining WHY a stage breaks down, never the diagnosis itself. Never say a site 'is' or 'should be' an archetype as the verdict — describe where and why the visitor's journey breaks down, e.g. 'Visitors arrive expecting to understand what you do, but your hero section leads with a feature list instead of an outcome — they never build the trust needed to reach your CTA.' Every journey_break must be anchored to exactly one of the five journey stages. Never use jargon. Always ground reasons in the actual site copy provided. Always connect each break to conversion impact.";

const JOURNEY_DIAGNOSIS_SCHEMA = {
  type: "object",
  properties: {
    narrative_verdict: { type: "string" },
    journey_breaks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          journey_stage: { type: "string", enum: JOURNEY_STAGES },
          element: { type: "string" },
          current_archetype_signal: { type: "string" },
          conflict_severity: { type: "integer", description: "Severity from 1 (minor) to 5 (critical)." },
          reason: { type: "string" },
        },
        required: ["journey_stage", "element", "current_archetype_signal", "conflict_severity", "reason"],
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
    .filter((b): b is JourneyBreak => b && typeof b === "object" && JOURNEY_STAGES.includes((b as JourneyBreak).journey_stage) && typeof (b as JourneyBreak).conflict_severity === "number")
    .map((b) => ({ ...b, conflict_severity: Math.min(5, Math.max(1, Math.round(b.conflict_severity))) }));
}

async function diagnoseJourney(args: {
  metadata: MinimalMetadata;
  industry: Industry;
  goal: string;
  currentArchetype: Archetype;
  targetArchetype: Archetype;
  totalScore: number;
}): Promise<JourneyDiagnosis | null> {
  if (!ANTHROPIC_API_KEY) {
    console.error("check-drift diagnoseJourney: ANTHROPIC_API_KEY is not set — skipping AI diagnosis.");
    return null;
  }
  const { metadata, industry, goal, currentArchetype, targetArchetype, totalScore } = args;
  const revenueLeak = totalScore < 40 ? "£2,800/mo" : totalScore < 60 ? "£1,100/mo" : "£480/mo";

  const userPayload = {
    findings: [] as unknown[],
    revenue_leak_estimate: revenueLeak,
    current_archetype: currentArchetype,
    target_archetype: targetArchetype,
    h1: metadata.h1Text,
    hero_copy_excerpt: metadata.paragraphExcerpt.slice(0, 200),
    primary_cta_text: metadata.ctas[0]?.text ?? "",
    meta_description: metadata.metaDescription ?? "",
    industry,
    goal,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1800,
        system: [{ type: "text", text: JOURNEY_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        output_config: { format: { type: "json_schema", schema: JOURNEY_DIAGNOSIS_SCHEMA } },
        messages: [{ role: "user", content: JSON.stringify(userPayload) }],
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`check-drift diagnoseJourney: Claude API returned ${response.status}: ${body.slice(0, 1000)}`);
      return null;
    }
    const data = await response.json();
    const textBlock = (data.content ?? []).find((b: { type: string }) => b.type === "text");
    if (!textBlock?.text) {
      console.error("check-drift diagnoseJourney: no text block in Claude response", JSON.stringify(data).slice(0, 1000));
      return null;
    }
    const parsed = JSON.parse(textBlock.text) as { narrative_verdict: string; journey_breaks: unknown };
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
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 800,
        system: [{ type: "text", text: REGRESSION_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        output_config: { format: { type: "json_schema", schema: REGRESSION_SCHEMA } },
        messages: [{ role: "user", content: JSON.stringify(userPayload) }],
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`check-drift assessRegression: Claude API returned ${response.status}: ${body.slice(0, 500)}`);
      return null;
    }
    const data = await response.json();
    const textBlock = (data.content ?? []).find((b: { type: string }) => b.type === "text");
    if (!textBlock?.text) return null;
    const parsed = JSON.parse(textBlock.text) as RegressionAssessment;
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
    .select("url, industry, goal, target_archetype, score")
    .eq("id", auditId)
    .maybeSingle();

  let driftEventsLogged = 0;
  if (audit?.url) {
    const fetchResult = await fetchHtml(audit.url);
    if (fetchResult.success) {
      const doc = new DOMParser().parseFromString(fetchResult.html, "text/html");
      if (doc) {
        const metadata = extractMinimalMetadata(doc);
        const currentArchetype = inferCurrentArchetype(metadata);
        const targetArchetype = (audit.target_archetype as Archetype) ?? "Hero";
        const diagnosis = await diagnoseJourney({
          metadata,
          industry: (audit.industry as Industry) ?? "saas",
          goal: audit.goal ?? "",
          currentArchetype,
          targetArchetype,
          totalScore: audit.score ?? 50,
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
          // just the original diagnosis.
          if (diagnosis.journey_breaks.length > 0) {
            const historyRows = diagnosis.journey_breaks.map((b) => ({
              audit_id: auditId,
              narrative_verdict: diagnosis.narrative_verdict,
              current_archetype: currentArchetype,
              target_archetype: targetArchetype,
              journey_stage: b.journey_stage,
              element: b.element,
              current_archetype_signal: b.current_archetype_signal,
              conflict_severity: b.conflict_severity,
              reason: b.reason,
            }));
            const { error: historyError } = await supabase.from("archetype_consistency_scores").insert(historyRows);
            if (historyError) console.error("check-drift: failed to append drift history:", historyError.message);
          }

          const newMaxByStage = new Map<JourneyStage, JourneyBreak>();
          for (const brk of diagnosis.journey_breaks) {
            const existing = newMaxByStage.get(brk.journey_stage);
            if (!existing || brk.conflict_severity > existing.conflict_severity) newMaxByStage.set(brk.journey_stage, brk);
          }

          const eventsToInsert: Record<string, unknown>[] = [];
          for (const [stage, brk] of newMaxByStage.entries()) {
            const priorSeverity = priorMaxByStage.get(stage) ?? 0;
            const delta = brk.conflict_severity - priorSeverity;
            if (delta < 1) continue;

            const history = historyByStage.get(stage) ?? [];
            const assessment = await assessRegression({
              journeyStage: stage,
              element: brk.element,
              history,
              newSeverity: brk.conflict_severity,
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
