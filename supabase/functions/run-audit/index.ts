import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── RUN-AUDIT ───
// The AI is the diagnosis. No rule-based checks, no scores, no findings library.
// This fetches the real page, extracts the signals the AI needs to reason about
// it (headline, nav, CTAs, testimonials, pricing, pronoun ratio, etc.), infers
// the site's current story archetype from those signals, and asks Claude for
// the whole diagnosis in one call: a narrative verdict, the journey breakdown
// (arrival/understanding/trust-building/decision/action, each with what's
// happening, what should happen, why, a recommended fix, and a ready-to-use
// AI prompt), and a revenue leak estimate grounded in what was actually found.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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
}
interface JourneyDiagnosis {
  narrative_verdict: string;
  revenue_leak_estimate: string;
  journey_breaks: JourneyBreak[];
}

interface PageSignals {
  url: string;
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

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

function cleanText(input: string | null | undefined): string {
  return (input ?? "").replace(/\s+/g, " ").trim();
}
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function countWordOccurrences(text: string, words: string[]): number {
  return words.reduce((sum, word) => sum + (text.match(new RegExp(`\\b${word}\\b`, "gi"))?.length ?? 0), 0);
}
function hasAny(text: string, patterns: string[]): boolean {
  return patterns.some((p) => text.includes(p));
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

function extractSignals(doc: Document, url: URL): PageSignals {
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
    url: url.toString(),
    domain: url.hostname,
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

// Archetype inference is signal-reading, not a rule-based scoring system — it's the
// input the AI reasons from, same as the rest of these signals. Kept lightweight.
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

function suggestTargetArchetype(industry: Industry, goal: string): Archetype {
  const g = goal.toLowerCase();
  switch (industry) {
    case "saas": return /enterprise|demo/.test(g) ? "Sage" : "Hero";
    case "ecommerce": return /gift|wellness|care/.test(g) ? "Caregiver" : "Hero";
    case "portfolio": return /consult|strategy|advis/.test(g) ? "Sage" : "Creator";
    case "healthcare": return "Caregiver";
    case "fintech": return /trust|transparent/.test(g) ? "Sage" : "Ruler";
    case "service": return /premium|exclusive|high-end/.test(g) ? "Ruler" : "Sage";
    default: return "Hero";
  }
}

const JOURNEY_SYSTEM_PROMPT =
  "You are UXpact's UX intelligence engine. You read a real site the way a visitor would and tell the story of what " +
  "actually happens to them. The site's story is the visitor's journey — arrival, understanding, trust-building, " +
  "decision, action — not a brand-personality label. Archetype (current vs target) is only the lens for explaining " +
  "WHY a stage breaks down, never the diagnosis itself. Never say a site 'is' or 'should be' an archetype as the " +
  "verdict — describe where and why the visitor's journey breaks down. Every journey_break must be anchored to " +
  "exactly one of the five journey stages, name what's happening, what should be happening instead, and why. " +
  "For each break also write: a concrete recommended fix, and a ready-to-use AI prompt someone could paste into an " +
  "AI coding tool to implement that fix on their own site (address it to their actual domain, be specific about " +
  "the change). Ground everything in the real content given — never invent facts about the page. Ground the " +
  "revenue_leak_estimate in the number and severity of the specific breaks found, not a generic guess — more and " +
  "more severe breaks justify a higher bracket. Never use jargon.";

const JOURNEY_DIAGNOSIS_SCHEMA = {
  type: "object",
  properties: {
    narrative_verdict: { type: "string", description: "2-3 sentences telling the story of what happens to a visitor on this page. Always shown first." },
    revenue_leak_estimate: { type: "string", enum: ["£480/mo", "£1,100/mo", "£2,800/mo", "£5,200/mo"] },
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
        },
        required: ["journey_stage", "element", "whats_happening", "what_should_happen", "reason", "fix", "ai_prompt"],
        additionalProperties: false,
      },
    },
  },
  required: ["narrative_verdict", "revenue_leak_estimate", "journey_breaks"],
  additionalProperties: false,
};

async function diagnoseJourney(args: {
  signals: PageSignals;
  industry: Industry;
  goal: string;
  archetype: { current: Archetype; target: Archetype };
}): Promise<JourneyDiagnosis | null> {
  if (!ANTHROPIC_API_KEY) {
    console.error("diagnoseJourney: ANTHROPIC_API_KEY is not set — skipping AI diagnosis.");
    return null;
  }
  const { signals, industry, goal, archetype } = args;
  const userPayload = {
    current_archetype: archetype.current,
    target_archetype: archetype.target,
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
  const timeoutId = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 4000,
        output_config: { effort: "medium", format: { type: "json_schema", schema: JOURNEY_DIAGNOSIS_SCHEMA } },
        system: [{ type: "text", text: JOURNEY_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: JSON.stringify(userPayload) }],
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`diagnoseJourney: Claude API returned ${response.status}: ${body.slice(0, 1000)}`);
      return null;
    }
    const data = await response.json();
    const textBlock = (data.content ?? []).find((b: { type: string }) => b.type === "text");
    if (!textBlock?.text) {
      console.error("diagnoseJourney: no text block in Claude response", JSON.stringify(data).slice(0, 1000));
      return null;
    }
    const parsed = JSON.parse(textBlock.text) as JourneyDiagnosis;
    if (!Array.isArray(parsed.journey_breaks)) return null;
    return parsed;
  } catch (error) {
    console.error("diagnoseJourney: request failed", error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function saveAudit(args: {
  url: string;
  domain: string;
  industry: Industry;
  goal: string;
  archetype: { current: Archetype; target: Archetype };
  domData: Record<string, unknown>;
  rawHtml: string;
  diagnosis: JourneyDiagnosis | null;
}): Promise<string | null> {
  if (!supabase) return null;
  const { url, domain, industry, goal, archetype, domData, rawHtml, diagnosis } = args;

  const { data: auditRow, error: auditError } = await supabase
    .from("audits")
    .insert({
      url, domain, industry, goal, status: "complete",
      dom_data: domData,
      raw_html: rawHtml,
      current_archetype: archetype.current,
      target_archetype: archetype.target,
      narrative_verdict: diagnosis?.narrative_verdict ?? null,
      revenue_leak_estimate: diagnosis?.revenue_leak_estimate ?? null,
    })
    .select("id")
    .single();
  if (auditError || !auditRow?.id) throw new Error(`Failed to create audit: ${auditError?.message}`);

  if (diagnosis && diagnosis.journey_breaks.length > 0) {
    const rows = diagnosis.journey_breaks.map((b) => ({
      audit_id: auditRow.id,
      narrative_verdict: diagnosis.narrative_verdict,
      current_archetype: archetype.current,
      target_archetype: archetype.target,
      journey_stage: b.journey_stage,
      element: b.element,
      current_archetype_signal: b.whats_happening,
      what_should_happen: b.what_should_happen,
      conflict_severity: null,
      reason: b.reason,
      fix: b.fix,
      ai_prompt: b.ai_prompt,
    }));
    const { error: journeyError } = await supabase.from("archetype_consistency_scores").insert(rows);
    if (journeyError) console.error("Failed to save journey breaks:", journeyError.message);
  }

  return auditRow.id;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const payload = await req.json();
    if (!payload?.url) return jsonResponse({ error: "url required" }, 400);

    let targetUrl: URL;
    try { targetUrl = new URL(payload.url); } catch { return jsonResponse({ error: "Invalid URL" }, 400); }

    const industry: Industry = ["saas", "ecommerce", "portfolio", "healthcare", "fintech", "service"].includes(payload.industry)
      ? payload.industry : "saas";
    const goal: string = typeof payload.goal === "string" ? payload.goal : "";

    const fetchResult = await fetchHtml(targetUrl.toString());
    if (!fetchResult.success) return jsonResponse({ error: "URL_UNREACHABLE", message: fetchResult.error }, 502);

    const { html } = fetchResult;
    const strippedText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const scriptCount = (html.match(/<script\b/gi) || []).length;
    if (strippedText.length < 200 && scriptCount > 5) {
      return jsonResponse({ error: "SPA_DETECTED", message: "Page appears JavaScript-rendered." }, 422);
    }

    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) return jsonResponse({ error: "Failed to parse HTML" }, 500);

    const signals = extractSignals(doc, targetUrl);
    const archetype = { current: inferCurrentArchetype(signals), target: suggestTargetArchetype(industry, goal) };

    const domData = {
      h1Text: signals.h1Text || signals.title || signals.domain,
      navLinks: signals.navLinks,
      ctaTexts: signals.ctaTexts,
      h2Texts: signals.h2Texts,
      paragraphTexts: signals.paragraphTexts,
      testimonialTexts: signals.testimonialTexts,
      trustLogoLabels: signals.trustLogoLabels,
      pricingTiers: signals.pricingTiers,
      imagesCount: signals.imagesCount,
      hasForm: signals.hasForm,
      metaTitle: signals.title ?? "",
    };

    const diagnosis = await diagnoseJourney({ signals, industry, goal, archetype });
    if (!diagnosis) {
      console.error(`run-audit: journey diagnosis failed for ${targetUrl.toString()} — see diagnoseJourney logs above.`);
    }

    const auditId = await saveAudit({ url: targetUrl.toString(), domain: signals.domain, industry, goal, archetype, domData, rawHtml: html, diagnosis });

    return jsonResponse({
      auditId,
      domData,
      currentArchetype: archetype.current,
      targetArchetype: archetype.target,
      narrativeVerdict: diagnosis?.narrative_verdict ?? null,
      revenueLeakEstimate: diagnosis?.revenue_leak_estimate ?? null,
      journeyBreaks: diagnosis?.journey_breaks.map((b) => ({
        journeyStage: b.journey_stage,
        element: b.element,
        whatsHappening: b.whats_happening,
        whatShouldHappen: b.what_should_happen,
        reason: b.reason,
        fix: b.fix,
        aiPrompt: b.ai_prompt,
      })) ?? null,
      diagnosisError: diagnosis ? null : "AI diagnosis failed — see server logs. No narrative verdict, journey breakdown, or revenue estimate is available for this run.",
    }, 200);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
