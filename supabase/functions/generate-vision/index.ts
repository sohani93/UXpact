// ─── UXPACT VISION SANDBOX — generate-vision Edge Function ───
// Step 1 of 2. Accepts a user's Vision sandbox choices, sends the real site
// HTML through the Python DOM-fidelity microservice (which now tags every
// top-level block with its classified data-uxpact-zone), then rewrites the
// page ONE SECTION AT A TIME instead of asking the AI to reproduce the
// whole document. Output per call is small and decoupled from the original
// page's size — this is what makes generation actually finish within
// Supabase's ~150s per-invocation ceiling for real-world pages (the old
// whole-document approach failed on anything much over ~35KB of cleaned
// HTML, which is most real sites; confirmed directly against
// myworks.software at 159KB and basecamp.com at 47KB, both of which failed
// every time under the old approach).
//
// Every section call receives the same chosen archetype and the same
// archetype-framework reference text, so a switched archetype produces a
// genuinely different, internally consistent full-page rewrite — not one
// section changing in isolation while the rest keeps its old voice.
//
// Returns a jobId immediately and does the actual work via
// EdgeRuntime.waitUntil. The frontend polls vision_generation_jobs (RLS
// allows anon SELECT) for the draft, then calls self-check-vision (step 2)
// to verify + revise it before ever showing it to the user.
//
// Never writes to vision_versions — saving a version is a separate,
// explicit frontend action (POST to vision_versions directly via the client).

import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAi } from "../_shared/ai-client.ts";
import { ARCHETYPE_FRAMEWORK } from "../_shared/archetype-framework.ts";

// ─── CORS ───
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status: number): Response {
  return jsonResponse({ error: code, message }, status);
}

// ─── CONFIG ───
const VISION_SERVICE_URL = Deno.env.get("VISION_SERVICE_URL");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const NO_OP_INSTRUCTIONS = new Set(["", "keep this section's current copy.", "keep current section."]);

interface GenerateVisionPayload {
  auditId?: string;
  archetype?: string;
  sectionOrder?: string[];
  copySelections?: Record<string, string>;
  rawHtml?: string;
}

// ─── PYTHON MICROSERVICE ───
async function processWithMicroservice(rawHtml: string, sectionOrder: string[]): Promise<{ success: true; html: string } | { success: false; message: string }> {
  if (!VISION_SERVICE_URL) {
    return { success: false, message: "Vision DOM service is not configured (VISION_SERVICE_URL unset)." };
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(VISION_SERVICE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawHtml, sectionOrder }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { success: false, message: `DOM service returned ${response.status}: ${body.slice(0, 300)}` };
    }
    const data = await response.json();
    if (!data?.html || typeof data.html !== "string") {
      return { success: false, message: "DOM service returned no HTML." };
    }
    return { success: true, html: data.html };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { success: false, message: "DOM service timed out." };
    }
    return { success: false, message: error instanceof Error ? error.message : "Failed to reach DOM service." };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── CLAUDE — ONE SECTION AT A TIME ───
const SECTION_SYSTEM_PROMPT =
  "You are a conversion-focused web designer and copywriter. You are given ONE section (a single HTML fragment) " +
  "from a larger real webpage, an instruction for what should change in that section, and the story archetype the " +
  "whole rebuilt page is being written in. Every section of this page is being rewritten separately in this same " +
  "archetype, so match its voice and intent exactly — this is one part of one internally consistent page, not an " +
  "isolated rewrite. Preserve the fragment's HTML structure, tag names, classes, and attributes as closely as " +
  "possible — only change text content and, where the instruction requires it, minor structural tweaks within this " +
  "fragment (reordering or adding/removing a small number of child elements). Never invent facts not implied by the " +
  "original content or the instruction. Return ONLY the rewritten HTML fragment — the same root element, nothing " +
  "else: no markdown fences, no explanation, no surrounding document.\n\n" +
  ARCHETYPE_FRAMEWORK;

function looksLikeFragment(text: string): boolean {
  const t = text.trim();
  return t.startsWith("<") && t.endsWith(">") && t.length > 10;
}

async function generateSection(args: {
  fragmentHtml: string;
  zone: string;
  instruction: string;
  archetype: string;
}): Promise<{ success: true; html: string } | { success: false; message: string }> {
  const { fragmentHtml, zone, instruction, archetype } = args;
  const userContent = JSON.stringify({
    archetype: archetype || "not specified",
    zone,
    instruction,
    original_fragment_html: fragmentHtml,
  });

  const result = await callAi({
    systemPrompt: SECTION_SYSTEM_PROMPT,
    userContent,
    maxOutputTokens: 8000,
    timeoutMs: 60_000,
  });
  if (!result.success) {
    console.error(`generateSection[${zone}]: AI call failed`, result.message);
    return { success: false, message: result.message };
  }
  const html = result.text.trim();
  if (!looksLikeFragment(html)) {
    console.error(`generateSection[${zone}]: malformed output`, html.slice(0, 300));
    return { success: false, message: "The AI did not return a valid HTML fragment for this section." };
  }
  return { success: true, html };
}

// ─── CLAUDE — A GROUP OF BLOCKS SHARING ONE ZONE, IN ONE CALL ───
// Real pages routinely have several blocks classified into the same zone —
// myworks.software has 7 separate "features" blocks, all of which always
// carry the exact same copySelections instruction (it's keyed by zone name,
// not by individual block). Calling generateSection once per block meant
// pages like that fired 7+ sequential Gemini requests for a single user
// selection, and confirmed directly against production logs that this blew
// through the free tier's request-rate quota and Supabase's own ~150s
// invocation ceiling before the pipeline could finish (job
// 1618e9cc-fc4c-4a46-84d4-db05d70573dc, 2026-09-04: repeated 429s across 7
// features blocks, function shut down mid-pipeline with the job stuck at
// "pending" forever). Batching every block of a shared zone into one
// structured-output call collapses that back down to one Gemini request per
// zone, regardless of how many blocks share it.
const ZONE_GROUP_SYSTEM_PROMPT =
  "You are a conversion-focused web designer and copywriter. You are given MULTIPLE HTML fragments — every block on " +
  "this real webpage that was classified into the SAME zone type (for example, several distinct 'features' blocks) " +
  "— one instruction that applies to all of them, and the story archetype the whole rebuilt page is being written " +
  "in. Every zone of this page is being rewritten separately in this same archetype, so match its voice and intent " +
  "exactly. Rewrite EACH fragment independently: keep its own original content, structure, tag names, classes, and " +
  "attributes as closely as possible, changing only text content and, where the instruction requires it, minor " +
  "structural tweaks within that fragment. Never invent facts not implied by the original content or the " +
  "instruction, and never merge, drop, reorder, or add fragments — return exactly as many rewritten fragments as " +
  "you were given, in the same order, one full HTML fragment per array item.\n\n" +
  ARCHETYPE_FRAMEWORK;

const ZONE_GROUP_SCHEMA = {
  type: "object",
  properties: {
    fragments: { type: "array", items: { type: "string" } },
  },
  required: ["fragments"],
};

function looksLikeFragmentList(value: unknown, expectedCount: number): value is string[] {
  return Array.isArray(value) && value.length === expectedCount && value.every((f) => typeof f === "string" && looksLikeFragment(f));
}

async function generateZoneGroup(args: {
  fragments: string[];
  zone: string;
  instruction: string;
  archetype: string;
}): Promise<{ success: true; fragments: string[] } | { success: false; message: string }> {
  const { fragments, zone, instruction, archetype } = args;
  const userContent = JSON.stringify({
    archetype: archetype || "not specified",
    zone,
    instruction,
    original_fragments_html: fragments,
  });

  const result = await callAi({
    systemPrompt: ZONE_GROUP_SYSTEM_PROMPT,
    userContent,
    // Scales with how many fragments are bundled into this one call — a
    // single shared budget would truncate every fragment past the first.
    maxOutputTokens: Math.min(8000 * fragments.length, 32_000),
    timeoutMs: 90_000,
    jsonSchema: ZONE_GROUP_SCHEMA,
  });
  if (!result.success) {
    console.error(`generateZoneGroup[${zone}]: AI call failed`, result.message);
    return { success: false, message: result.message };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.text);
  } catch {
    console.error(`generateZoneGroup[${zone}]: response was not valid JSON`, result.text.slice(0, 300));
    return { success: false, message: "The AI did not return valid JSON for this group of sections." };
  }
  const candidateFragments = (parsed as { fragments?: unknown } | null)?.fragments;
  if (!looksLikeFragmentList(candidateFragments, fragments.length)) {
    console.error(`generateZoneGroup[${zone}]: malformed or mismatched fragment count (expected ${fragments.length})`, JSON.stringify(parsed).slice(0, 300));
    return { success: false, message: `The AI did not return ${fragments.length} valid HTML fragments for this group of sections.` };
  }
  return { success: true, fragments: candidateFragments };
}

// ─── PIPELINE ───
async function runPipeline(jobId: string, payload: GenerateVisionPayload): Promise<void> {
  if (!supabase) return;

  const fail = async (message: string) => {
    await supabase.from("vision_generation_jobs").update({ status: "error", error_message: message, completed_at: new Date().toISOString() }).eq("id", jobId);
  };

  const rawHtml = payload.rawHtml;
  if (!rawHtml || typeof rawHtml !== "string") {
    return fail("rawHtml is required — this audit predates raw HTML capture.");
  }

  const archetype = typeof payload.archetype === "string" ? payload.archetype : "";
  const sectionOrder = Array.isArray(payload.sectionOrder) ? payload.sectionOrder.filter((s): s is string => typeof s === "string") : [];
  const copySelections = payload.copySelections && typeof payload.copySelections === "object" ? payload.copySelections : {};

  const domResult = await processWithMicroservice(rawHtml, sectionOrder);
  if (domResult.success === false) {
    return fail(domResult.message);
  }

  const doc = new DOMParser().parseFromString(domResult.html, "text/html");
  if (!doc) {
    return fail("Failed to parse the cleaned page HTML.");
  }
  // Re-serialize the whole document through deno_dom right away, and use
  // THIS string (not the raw Python-service string) as the base for the
  // string-replace assembly below. deno_dom's outerHTML serialization can
  // differ from BeautifulSoup's (attribute quoting/ordering, whitespace),
  // so matching el.outerHTML fragments against the original raw string
  // silently fails to find a match — confirmed directly: two full test
  // runs against myworks.software produced byte-identical output length
  // and zero regenerated sections even when generateSection succeeded.
  // Both fragment and base must come from the same serializer.
  const documentHtml = doc.documentElement?.outerHTML ?? domResult.html;
  const zoneElements = Array.from(doc.querySelectorAll("[data-uxpact-zone]"));
  if (zoneElements.length === 0) {
    return fail("Couldn't identify any page sections to rewrite in this page's structure.");
  }

  const sections = zoneElements.map((el) => {
    const zone = el.getAttribute("data-uxpact-zone") ?? "features";
    return { zone, originalFragment: el.outerHTML, instruction: (copySelections[zone] ?? "").trim() };
  });

  // Sequential across zones, not Promise.all — confirmed directly that
  // firing AI calls concurrently trips Google AI Studio's free-tier quota
  // well before a multi-section real page finishes. Within a zone, every
  // block sharing that zone always carries the same copySelections
  // instruction (it's keyed by zone name, not by individual block), so
  // they're batched into ONE generateZoneGroup call instead of one call
  // per block — a real page can have several blocks in the same zone
  // (myworks.software has 7 "features" blocks), and one call per block
  // was confirmed to blow through both the free-tier rate limit and
  // Supabase's ~150s invocation ceiling before finishing.
  const zoneOrder: string[] = [];
  const zoneIndices = new Map<string, number[]>();
  sections.forEach((s, i) => {
    if (!zoneIndices.has(s.zone)) {
      zoneIndices.set(s.zone, []);
      zoneOrder.push(s.zone);
    }
    zoneIndices.get(s.zone)!.push(i);
  });

  const finalFragments: string[] = sections.map((s) => s.originalFragment);
  for (const zone of zoneOrder) {
    const indices = zoneIndices.get(zone)!;
    const instruction = sections[indices[0]].instruction;
    if (NO_OP_INSTRUCTIONS.has(instruction.toLowerCase())) continue; // stays unchanged for every block in this zone

    if (indices.length === 1) {
      const s = sections[indices[0]];
      const gen = await generateSection({ fragmentHtml: s.originalFragment, zone, instruction, archetype });
      if (gen.success) finalFragments[indices[0]] = gen.html;
      else console.error(`generate-vision: section "${zone}" kept unchanged after generation failure — ${gen.message}`);
      continue;
    }

    const fragments = indices.map((i) => sections[i].originalFragment);
    const gen = await generateZoneGroup({ fragments, zone, instruction, archetype });
    if (gen.success) {
      indices.forEach((i, k) => { finalFragments[i] = gen.fragments[k]; });
    } else {
      console.error(`generate-vision: zone "${zone}" (${fragments.length} blocks) kept unchanged after generation failure — ${gen.message}`);
    }
  }

  const results = sections.map((s, i) => ({ ...s, finalFragment: finalFragments[i] }));

  let finalHtml = documentHtml;
  for (const r of results) {
    if (r.finalFragment === r.originalFragment) continue;
    if (!finalHtml.includes(r.originalFragment)) {
      console.error(`generate-vision: section "${r.zone}" regenerated but its original fragment wasn't found in the assembled document — splice skipped, keeping this section unchanged.`);
      continue;
    }
    finalHtml = finalHtml.replace(r.originalFragment, r.finalFragment);
  }

  const changedCount = results.filter((r) => r.finalFragment !== r.originalFragment).length;
  const { error: updateError } = await supabase
    .from("vision_generation_jobs")
    .update({ status: "done", html: finalHtml, completed_at: new Date().toISOString() })
    .eq("id", jobId);
  if (updateError) console.error("generate-vision: failed to write completed job", updateError.message);
  else console.log(`generate-vision: assembled ${sections.length} sections, ${changedCount} regenerated, archetype=${archetype || "none"}`);
}

// ─── MAIN HANDLER ───
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  if (!supabase) return errorResponse("NOT_CONFIGURED", "Supabase is not configured for this function.", 500);

  let payload: GenerateVisionPayload;
  try {
    payload = await req.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be JSON", 400);
  }

  if (!payload.rawHtml || typeof payload.rawHtml !== "string") {
    return errorResponse("MISSING_RAW_HTML", "rawHtml is required — this audit predates raw HTML capture.", 400);
  }

  const auditId = typeof payload.auditId === "string" ? payload.auditId : null;
  const { data: job, error: insertError } = await supabase
    .from("vision_generation_jobs")
    .insert({ audit_id: auditId, status: "pending", stage: "generate" })
    .select("id")
    .single();
  if (insertError || !job?.id) {
    return errorResponse("JOB_CREATE_FAILED", insertError?.message ?? "Failed to create generation job.", 500);
  }

  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil(runPipeline(job.id, payload));

  return jsonResponse({ jobId: job.id }, 202);
});
