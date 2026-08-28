import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── UX PULSE — DRIFT CHECK ───
// The engine behind UX Pulse: watches a live site via the embed script,
// re-runs the diagnosis when the page changes, and reasons about whether
// things got worse. Never auto-fixes anything.
//
// Two ways in:
// 1. Reactive — the embed script reports zone fingerprints when
//    serve-variant flags a check is due. Cheap path: diff fingerprints
//    against the stored baseline, update it, return. Expensive path
//    (throttled to once per 6h per audit): re-fetch the live URL, re-run
//    the diagnosis, and log a drift event for any journey stage that got
//    worse.
// 2. Scheduled — pg_cron calls this with just {auditId, domain}, no
//    fingerprints, for every UX-Pulse-tracked audit every 6h, so a site
//    with zero visitor traffic still gets checked.
//
// Every expensive-path run appends its journey breaks to
// archetype_consistency_scores, building a real accumulating drift history.
// When a stage gets worse, a second Claude call reasons over that stage's
// full historical severity sequence to judge whether it's a one-off dip or
// a repeated/escalating regression — that reasoning, not a bare number, is
// what UX Pulse surfaces.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const db = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const FINGERPRINT_CHANGE_THRESHOLD = 0.2; // >20% word-count change on a zone = candidate for a full recheck
const FULL_CHECK_THROTTLE_MS = 6 * 60 * 60 * 1000; // 6 hours

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
  severity: number; // internal-only signal for drift comparison, never shown to the user as a score
}
interface Diagnosis {
  narrative_verdict: string;
  journey_breaks: JourneyBreak[];
}

interface ZoneFingerprint { wordCount: number; textLength: number }
interface CheckDriftPayload {
  auditId?: string;
  domain?: string;
  fingerprints?: Record<string, ZoneFingerprint>;
}

interface PageContent {
  domain: string;
  title: string | null;
  metaDescription: string | null;
  h1: string;
  h2s: string[];
  navLinks: string[];
  ctaTexts: string[];
  paragraphs: string[];
  testimonials: string[];
  trustLogos: string[];
  pricingTiers: { name: string; price: string }[];
  imageCount: number;
  hasForm: boolean;
  wordCount: number;
  youWeRatio: number;
}

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}
function occurrences(text: string, words: string[]): number {
  return words.reduce((total, word) => total + (text.match(new RegExp(`\\b${word}\\b`, "gi"))?.length ?? 0), 0);
}
function containsAny(text: string, patterns: string[]): boolean {
  return patterns.some((p) => text.includes(p));
}

async function collectStreamedText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const evt = JSON.parse(line.slice(6));
        if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") out += evt.delta.text;
      } catch { /* skip malformed SSE line */ }
    }
  }
  return out;
}

async function fetchPage(url: string): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "UXpactBot/1.0", Accept: "text/html,application/xhtml+xml" },
    });
    return { ok: true, html: await res.text() };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return { ok: false, error: "Request timed out" };
    return { ok: false, error: err instanceof Error ? err.message : "Failed to fetch URL" };
  } finally {
    clearTimeout(timer);
  }
}

function readPage(doc: Document, domain: string): PageContent {
  const title = clean(doc.querySelector("title")?.textContent) || null;
  const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute("content") ?? null;
  const h1 = clean(doc.querySelector("h1")?.textContent);
  const h2s = Array.from(doc.querySelectorAll("h2")).map((h) => clean(h.textContent)).filter(Boolean).slice(0, 8);

  const header = doc.querySelector("header");
  const nav = header?.querySelector("nav") ?? doc.querySelector("nav");
  const navLinks = nav ? Array.from(nav.querySelectorAll("a")).map((a) => clean(a.textContent)).filter(Boolean).slice(0, 10) : [];

  const ctaTexts = Array.from(doc.querySelectorAll("a, button"))
    .map((el) => clean(el.textContent))
    .filter((t) => t.length > 1 && t.length < 40)
    .slice(0, 15);

  const paragraphs = Array.from(doc.querySelectorAll("p")).map((p) => clean(p.textContent)).filter((p) => p.length > 15).slice(0, 8);

  const testimonials = Array.from(doc.querySelectorAll("blockquote, [class*='testimonial' i], [class*='review' i]"))
    .map((n) => clean(n.textContent).slice(0, 220))
    .filter((t) => t.length > 15)
    .slice(0, 5);

  const trustLogos = Array.from(doc.querySelectorAll("img"))
    .filter((img) => /logo|client|partner|brand/i.test(`${img.getAttribute("src") ?? ""} ${img.getAttribute("alt") ?? ""} ${img.getAttribute("class") ?? ""}`))
    .map((img) => clean(img.getAttribute("alt")))
    .filter(Boolean)
    .slice(0, 6);

  const pricingTiers = (() => {
    const priceRegex = /[£$€]\s?\d[\d,.]*/;
    const tiers: { name: string; price: string }[] = [];
    for (const el of Array.from(doc.querySelectorAll("[class*='pric' i], [class*='plan' i], [class*='tier' i]"))) {
      const match = el.textContent?.match(priceRegex);
      if (!match) continue;
      const heading = el.querySelector("h1, h2, h3, h4, [class*='name' i], [class*='title' i]");
      const name = clean(heading?.textContent) || clean(el.textContent).slice(0, 24);
      if (!name || tiers.some((t) => t.name === name)) continue;
      tiers.push({ name, price: match[0] });
      if (tiers.length >= 4) break;
    }
    return tiers;
  })();

  const bodyText = clean(doc.body?.textContent ?? "");
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;
  const you = occurrences(bodyText, ["you", "your", "yours"]);
  const we = occurrences(bodyText, ["we", "our", "us"]);

  return {
    domain, title, metaDescription, h1, h2s, navLinks, ctaTexts, paragraphs, testimonials, trustLogos, pricingTiers,
    imageCount: doc.querySelectorAll("img").length,
    hasForm: doc.querySelectorAll("form").length > 0,
    wordCount,
    youWeRatio: we === 0 ? (you > 0 ? 99 : 0) : you / we,
  };
}

function readCurrentArchetype(page: PageContent): Archetype {
  const weight: Record<Archetype, number> = { Hero: 0, Sage: 0, Outlaw: 0, Caregiver: 0, Creator: 0, Ruler: 0 };
  if (page.youWeRatio >= 4) { weight.Hero += 2; weight.Caregiver += 1; }
  else if (page.youWeRatio >= 2) weight.Hero += 1;
  else if (page.youWeRatio < 1) { weight.Ruler += 1; weight.Sage += 1; }

  const ctaText = page.ctaTexts.join(" ").toLowerCase();
  const verbHits: [Archetype, number][] = [
    ["Hero", occurrences(ctaText, ["get", "start", "fix", "build", "boost", "grow", "save", "win", "try"])],
    ["Sage", occurrences(ctaText, ["learn", "explore", "read", "discover"])],
    ["Ruler", occurrences(ctaText, ["apply", "request", "inquire"])],
    ["Caregiver", occurrences(ctaText, ["talk", "support", "join", "chat", "connect"])],
  ];
  const topVerb = verbHits.sort((a, b) => b[1] - a[1])[0];
  if (topVerb[1] > 0) weight[topVerb[0]] += 2;

  if (page.wordCount > 800) weight.Sage += 2;
  else if (page.wordCount < 300) { weight.Hero += 1; weight.Outlaw += 1; }

  const headings = `${page.h1} ${page.h2s.join(" ")}`.toLowerCase();
  if (containsAny(headings, ["transform", "results", "faster", "grow", "boost", "win"])) weight.Hero += 2;
  if (containsAny(headings, ["research", "proven", "methodology", "expert", "insight"])) weight.Sage += 2;
  if (containsAny(headings, ["stop", "ditch", "break", "rules", "different"])) weight.Outlaw += 2;
  if (containsAny(headings, ["support", "help", "care", "together", "safe", "guide"])) weight.Caregiver += 2;
  if (containsAny(headings, ["premium", "exclusive", "leading", "definitive", "elite", "authority"])) weight.Ruler += 2;
  if (containsAny(headings, ["craft", "design", "create", "portfolio", "studio"])) weight.Creator += 2;
  if (page.trustLogos.length >= 3) weight.Ruler += 1;
  if (page.testimonials.length > 0) weight.Caregiver += 1;

  const ranked = (Object.entries(weight) as [Archetype, number][]).sort((a, b) => b[1] - a[1]);
  return ranked[0][1] > 0 ? ranked[0][0] : "Hero";
}

const DIAGNOSIS_SYSTEM_PROMPT =
  "You are UXpact's UX intelligence engine, re-checking a site you've diagnosed before. You read the site the way a " +
  "visitor would and tell the story of what actually happens to them. The site's story is the visitor's journey — " +
  "arrival, understanding, trust-building, decision, action — not a brand-personality label. Archetype (current vs " +
  "target) is only the lens for explaining WHY a stage breaks down, never the diagnosis itself. Every journey_break " +
  "must be anchored to exactly one of the five journey stages, name what's happening, what should be happening " +
  "instead, and why. For each break also write a concrete recommended fix, a ready-to-use AI prompt someone could " +
  "paste into an AI coding tool to implement that fix, and a severity from 1 (minor) to 5 (critical) reflecting how " +
  "badly this break hurts conversion right now — severity is an internal signal used only to detect whether things " +
  "have gotten worse since the last check, never shown to the end user as a score. Ground everything in the real " +
  "content given — never invent facts about the page. Never use jargon.";

const DIAGNOSIS_SCHEMA = {
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

async function runDiagnosis(args: {
  page: PageContent;
  industry: Industry;
  goal: string;
  currentArchetype: Archetype;
  targetArchetype: Archetype;
}): Promise<Diagnosis | null> {
  if (!ANTHROPIC_API_KEY) {
    console.error("check-drift runDiagnosis: ANTHROPIC_API_KEY is not set.");
    return null;
  }
  const { page, industry, goal, currentArchetype, targetArchetype } = args;
  const payload = {
    current_archetype: currentArchetype,
    target_archetype: targetArchetype,
    industry,
    goal,
    domain: page.domain,
    title: page.title,
    meta_description: page.metaDescription,
    h1: page.h1,
    h2s: page.h2s,
    nav_links: page.navLinks,
    cta_texts: page.ctaTexts,
    paragraphs: page.paragraphs,
    testimonials: page.testimonials,
    trust_logos: page.trustLogos,
    pricing_tiers: page.pricingTiers,
    has_form: page.hasForm,
    image_count: page.imageCount,
    word_count: page.wordCount,
    you_we_ratio: Number(page.youWeRatio.toFixed(2)),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 4000,
        stream: true,
        output_config: { effort: "medium", format: { type: "json_schema", schema: DIAGNOSIS_SCHEMA } },
        system: [{ type: "text", text: DIAGNOSIS_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: JSON.stringify(payload) }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`check-drift runDiagnosis: Claude API returned ${res.status}: ${body.slice(0, 1000)}`);
      return null;
    }
    const text = await collectStreamedText(res);
    if (!text) return null;
    const parsed = JSON.parse(text) as { narrative_verdict: string; journey_breaks: unknown };
    return { narrative_verdict: parsed.narrative_verdict, journey_breaks: sanitizeJourneyBreaks(parsed.journey_breaks) };
  } catch (err) {
    console.error("check-drift runDiagnosis: request failed", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const REGRESSION_SYSTEM_PROMPT =
  "You are a UX regression analyst. You are given the full historical sequence of severity readings (1-5) for a " +
  "single journey stage on one site, oldest first, plus this run's new reading. Decide whether the new rise is a " +
  "one-off dip — noise, a temporary A/B test, a single bad snapshot — or a repeated/escalating regression worth " +
  "escalating differently: severity climbing across multiple readings, or the same or worse severity recurring " +
  "after it was previously flagged. Ground your judgment in the actual sequence given, not assumptions.";

const REGRESSION_SCHEMA = {
  type: "object",
  properties: {
    regression_type: { type: "string", enum: ["one_off", "repeated"] },
    reasoning: { type: "string", description: "One or two sentences, citing the specific historical readings that justify the judgment." },
  },
  required: ["regression_type", "reasoning"],
  additionalProperties: false,
};

interface RegressionAssessment { regression_type: "one_off" | "repeated"; reasoning: string }

async function assessRegression(args: {
  journeyStage: JourneyStage;
  element: string;
  history: { severity: number; checkedAt: string }[];
  newSeverity: number;
}): Promise<RegressionAssessment | null> {
  if (!ANTHROPIC_API_KEY) return null;
  const payload = {
    journey_stage: args.journeyStage,
    element: args.element,
    historical_severities_oldest_first: args.history.map((h) => ({ severity: h.severity, checked_at: h.checkedAt })),
    new_severity: args.newSeverity,
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 800,
        stream: true,
        output_config: { effort: "low", format: { type: "json_schema", schema: REGRESSION_SCHEMA } },
        system: [{ type: "text", text: REGRESSION_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: JSON.stringify(payload) }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`check-drift assessRegression: Claude API returned ${res.status}: ${body.slice(0, 500)}`);
      return null;
    }
    const text = await collectStreamedText(res);
    if (!text) return null;
    const parsed = JSON.parse(text) as RegressionAssessment;
    if (parsed.regression_type !== "one_off" && parsed.regression_type !== "repeated") return null;
    return parsed;
  } catch (err) {
    console.error("check-drift assessRegression: request failed", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function hasCandidateZone(incoming: Record<string, ZoneFingerprint>, baseline: Record<string, ZoneFingerprint> | null): boolean {
  if (!baseline) return false;
  for (const [zone, current] of Object.entries(incoming)) {
    const prior = baseline[zone];
    if (!prior || prior.wordCount === 0) continue;
    if (Math.abs(current.wordCount - prior.wordCount) / prior.wordCount > FINGERPRINT_CHANGE_THRESHOLD) return true;
  }
  return false;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS, status: 204 });
  if (req.method !== "POST") return json({ checked: false }, 405);
  if (!db) return json({ checked: false }, 200);

  let payload: CheckDriftPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ checked: false }, 400);
  }

  const auditId = typeof payload.auditId === "string" ? payload.auditId : null;
  const domain = typeof payload.domain === "string" ? payload.domain : null;
  const fingerprints = payload.fingerprints && typeof payload.fingerprints === "object" ? payload.fingerprints : null;
  if (!auditId) return json({ checked: false }, 400);

  const scheduled = !fingerprints;

  const { data: snapshot } = await db
    .from("site_snapshots")
    .select("zone_fingerprints, last_full_check_at")
    .eq("audit_id", auditId)
    .maybeSingle();

  const throttled = Boolean(snapshot?.last_full_check_at) && Date.now() - new Date(snapshot!.last_full_check_at as string).getTime() < FULL_CHECK_THROTTLE_MS;

  if (!scheduled) {
    const baseline = (snapshot?.zone_fingerprints as Record<string, ZoneFingerprint> | null) ?? null;
    const candidate = hasCandidateZone(fingerprints!, baseline);
    if (!candidate || throttled) {
      await db.from("site_snapshots").upsert(
        { audit_id: auditId, domain, zone_fingerprints: fingerprints, last_checked_at: new Date().toISOString() },
        { onConflict: "audit_id" },
      );
      return json({ checked: true, escalated: false }, 200);
    }
  } else if (throttled) {
    return json({ checked: true, escalated: false, scheduled: true, skipped: "throttled" }, 200);
  }

  const { data: audit } = await db
    .from("audits")
    .select("url, domain, industry, goal, target_archetype")
    .eq("id", auditId)
    .maybeSingle();

  let driftEventsLogged = 0;
  if (audit?.url) {
    const fetched = await fetchPage(audit.url);
    if (fetched.ok) {
      const doc = new DOMParser().parseFromString(fetched.html, "text/html");
      if (doc) {
        const page = readPage(doc, (audit.domain as string) ?? domain ?? "");
        const currentArchetype = readCurrentArchetype(page);
        const targetArchetype = (audit.target_archetype as Archetype) ?? "Hero";
        const diagnosis = await runDiagnosis({
          page,
          industry: (audit.industry as Industry) ?? "saas",
          goal: audit.goal ?? "",
          currentArchetype,
          targetArchetype,
        });

        if (diagnosis) {
          const { data: storedBreaks } = await db
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
            const { error } = await db.from("archetype_consistency_scores").insert(historyRows);
            if (error) console.error("check-drift: failed to append drift history:", error.message);
          }

          const newMaxByStage = new Map<JourneyStage, JourneyBreak>();
          for (const b of diagnosis.journey_breaks) {
            const existing = newMaxByStage.get(b.journey_stage);
            if (!existing || b.severity > existing.severity) newMaxByStage.set(b.journey_stage, b);
          }

          const eventsToInsert: Record<string, unknown>[] = [];
          for (const [stage, b] of newMaxByStage.entries()) {
            const priorSeverity = priorMaxByStage.get(stage) ?? 0;
            const delta = b.severity - priorSeverity;
            if (delta < 1) continue;

            const history = historyByStage.get(stage) ?? [];
            const assessment = await assessRegression({ journeyStage: stage, element: b.element, history, newSeverity: b.severity });

            eventsToInsert.push({
              audit_id: auditId,
              domain,
              element: b.element,
              severity_delta: delta,
              suggested_variant_id: null,
              regression_type: assessment?.regression_type ?? null,
              reasoning: assessment?.reasoning ?? null,
            });
            if (!assessment) console.error(`check-drift: regression reasoning failed for stage "${stage}" on audit ${auditId}.`);
          }

          if (eventsToInsert.length > 0) {
            const { error } = await db.from("drift_events").insert(eventsToInsert);
            if (!error) driftEventsLogged = eventsToInsert.length;
            else console.error("check-drift: failed to insert drift_events:", error.message);
          }
        } else {
          console.error(`check-drift: diagnosis failed for audit ${auditId} (${audit.url}).`);
        }
      }
    } else {
      console.error(`check-drift: failed to re-fetch ${audit.url}:`, fetched.error);
    }
  }

  const now = new Date().toISOString();
  await db.from("site_snapshots").upsert(
    {
      audit_id: auditId,
      domain,
      zone_fingerprints: fingerprints ?? (snapshot?.zone_fingerprints as Record<string, ZoneFingerprint> | null) ?? {},
      last_checked_at: now,
      last_full_check_at: now,
    },
    { onConflict: "audit_id" },
  );

  return json({ checked: true, escalated: true, scheduled, driftEventsLogged }, 200);
});
