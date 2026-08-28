import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── DIAGNOSIS ───
// UXpact's core: an AI narrative verdict on what actually happens to a
// visitor on a real page, the journey breakdown (arrival, understanding,
// trust-building, decision, action) with the specific breaks found at each
// stage, and a revenue leak estimate grounded in those breaks. No rule
// checks, no numeric score, no findings library — the diagnosis IS the
// product.

const CORS = {
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
interface Diagnosis {
  narrative_verdict: string;
  revenue_leak_estimate: string;
  journey_breaks: JourneyBreak[];
}

interface PageContent {
  url: string;
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

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const db = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
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

// Streams the Claude response and concatenates only the text deltas — a
// non-streaming request with a multi-thousand-token budget risks stalling
// past any client-side timeout before the server finishes generating.
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

function readPage(doc: Document, url: URL): PageContent {
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
    url: url.toString(),
    domain: url.hostname,
    title,
    metaDescription,
    h1,
    h2s,
    navLinks,
    ctaTexts,
    paragraphs,
    testimonials,
    trustLogos,
    pricingTiers,
    imageCount: doc.querySelectorAll("img").length,
    hasForm: doc.querySelectorAll("form").length > 0,
    wordCount,
    youWeRatio: we === 0 ? (you > 0 ? 99 : 0) : you / we,
  };
}

// Archetype reading is a lightweight signal read that feeds the AI's
// reasoning — not a scoring system, and never shown to the visitor as a
// bare label. It's the lens the diagnosis explains itself through.
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

function readTargetArchetype(industry: Industry, goal: string): Archetype {
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

const DIAGNOSIS_SYSTEM_PROMPT =
  "You are UXpact's UX intelligence engine. You read a real site the way a visitor would and tell the story of what " +
  "actually happens to them. The site's story is the visitor's journey — arrival, understanding, trust-building, " +
  "decision, action — not a brand-personality label. Archetype (current vs target) is only the lens for explaining " +
  "WHY a stage breaks down, never the diagnosis itself. Never say a site 'is' or 'should be' an archetype as the " +
  "verdict — describe where and why the visitor's journey breaks down. Every journey_break must be anchored to " +
  "exactly one of the five journey stages, name what's happening, what should be happening instead, and why. For " +
  "each break also write a concrete recommended fix, and a ready-to-use AI prompt someone could paste into an AI " +
  "coding tool to implement that fix on their own site (address it to their actual domain, be specific about the " +
  "change). Ground everything in the real content given — never invent facts about the page. Ground the " +
  "revenue_leak_estimate in the number and severity of the specific breaks found, not a generic guess — more and " +
  "more severe breaks justify a higher bracket. Never use jargon.";

const DIAGNOSIS_SCHEMA = {
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

async function runDiagnosis(args: {
  page: PageContent;
  industry: Industry;
  goal: string;
  currentArchetype: Archetype;
  targetArchetype: Archetype;
}): Promise<Diagnosis | null> {
  if (!ANTHROPIC_API_KEY) {
    console.error("runDiagnosis: ANTHROPIC_API_KEY is not set — cannot diagnose.");
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
  const timer = setTimeout(() => controller.abort(), 120_000);
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
      console.error(`runDiagnosis: Claude API returned ${res.status}: ${body.slice(0, 1000)}`);
      return null;
    }
    const text = await collectStreamedText(res);
    if (!text) {
      console.error("runDiagnosis: no text in streamed Claude response");
      return null;
    }
    const parsed = JSON.parse(text) as Diagnosis;
    if (!Array.isArray(parsed.journey_breaks)) return null;
    return parsed;
  } catch (err) {
    console.error("runDiagnosis: request failed", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function persistDiagnosis(args: {
  url: string;
  domain: string;
  industry: Industry;
  goal: string;
  currentArchetype: Archetype;
  targetArchetype: Archetype;
  pageSummary: Record<string, unknown>;
  rawHtml: string;
  diagnosis: Diagnosis | null;
}): Promise<string | null> {
  if (!db) return null;
  const { url, domain, industry, goal, currentArchetype, targetArchetype, pageSummary, rawHtml, diagnosis } = args;

  const { data: auditRow, error: auditError } = await db
    .from("audits")
    .insert({
      url, domain, industry, goal, status: "complete",
      dom_data: pageSummary,
      raw_html: rawHtml,
      current_archetype: currentArchetype,
      target_archetype: targetArchetype,
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
      current_archetype: currentArchetype,
      target_archetype: targetArchetype,
      journey_stage: b.journey_stage,
      element: b.element,
      current_archetype_signal: b.whats_happening,
      what_should_happen: b.what_should_happen,
      conflict_severity: null,
      reason: b.reason,
      fix: b.fix,
      ai_prompt: b.ai_prompt,
    }));
    const { error: rowsError } = await db.from("archetype_consistency_scores").insert(rows);
    if (rowsError) console.error("persistDiagnosis: failed to save journey breaks:", rowsError.message);
  }

  return auditRow.id;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS, status: 204 });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const payload = await req.json();
    if (!payload?.url) return json({ error: "url required" }, 400);

    let target: URL;
    try { target = new URL(payload.url); } catch { return json({ error: "Invalid URL" }, 400); }

    const industry: Industry = ["saas", "ecommerce", "portfolio", "healthcare", "fintech", "service"].includes(payload.industry)
      ? payload.industry : "saas";
    const goal: string = typeof payload.goal === "string" ? payload.goal : "";

    const fetched = await fetchPage(target.toString());
    if (!fetched.ok) return json({ error: "URL_UNREACHABLE", message: fetched.error }, 502);

    const { html } = fetched;
    const strippedText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const scriptCount = (html.match(/<script\b/gi) || []).length;
    if (strippedText.length < 200 && scriptCount > 5) {
      return json({ error: "SPA_DETECTED", message: "Page appears JavaScript-rendered." }, 422);
    }

    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) return json({ error: "Failed to parse HTML" }, 500);

    const page = readPage(doc, target);
    const currentArchetype = readCurrentArchetype(page);
    const targetArchetype = readTargetArchetype(industry, goal);

    const pageSummary = {
      h1Text: page.h1 || page.title || page.domain,
      navLinks: page.navLinks,
      ctaTexts: page.ctaTexts,
      h2Texts: page.h2s,
      paragraphTexts: page.paragraphs,
      testimonialTexts: page.testimonials,
      trustLogoLabels: page.trustLogos,
      pricingTiers: page.pricingTiers,
      imagesCount: page.imageCount,
      hasForm: page.hasForm,
      metaTitle: page.title ?? "",
    };

    const diagnosis = await runDiagnosis({ page, industry, goal, currentArchetype, targetArchetype });
    if (!diagnosis) {
      console.error(`run-audit: diagnosis failed for ${target.toString()} — see runDiagnosis logs above.`);
    }

    const auditId = await persistDiagnosis({
      url: target.toString(), domain: page.domain, industry, goal,
      currentArchetype, targetArchetype, pageSummary, rawHtml: html, diagnosis,
    });

    return json({
      auditId,
      domData: pageSummary,
      currentArchetype,
      targetArchetype,
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
      diagnosisError: diagnosis ? null : "The AI diagnosis failed for this run — see server logs. No narrative verdict, journey breakdown, or revenue estimate is available.",
    }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
