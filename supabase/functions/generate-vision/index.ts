// ─── UXPACT VISION SANDBOX — generate-vision Edge Function ───
// Step 1 of 2. Accepts a user's Vision sandbox choices, sends the real site
// HTML through the Python DOM-fidelity microservice, then has Claude
// rewrite/restructure it per those choices. Returns a jobId immediately and
// does the actual work via EdgeRuntime.waitUntil — Supabase Edge Functions
// have a hard ~150s per-invocation wall-clock limit (measured directly
// against this project), and a full page rewrite with a 16k-token output
// budget routinely runs close to or past that on its own. The frontend
// polls vision_generation_jobs (RLS allows anon SELECT) for the draft, then
// calls self-check-vision (step 2) to verify + revise it before ever
// showing it to the user.
//
// Never writes to vision_versions — saving a version is a separate,
// explicit frontend action (POST to vision_versions directly via the client).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAi } from "../_shared/ai-client.ts";

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

const GENERATE_VISION_SYSTEM_PROMPT =
  "You are a conversion-focused web designer and copywriter. You receive a real website's HTML and a set of instructions. " +
  "You return a complete, valid, self-contained HTML document — the same site, restructured and rewritten per the instructions. " +
  "Preserve all visual design, CSS, images, and layout. Only change structure and copy per the instructions. " +
  "Never add fictional content. Never remove brand elements. Return only the HTML document, nothing else. " +
  "The <head> of the input HTML may contain <link>/<style> tags that load web fonts (e.g. Google Fonts) or other " +
  "external stylesheets the visual design depends on — carry every one of these over into your output's <head> " +
  "exactly as given, even if the tags don't visibly relate to the sections you're restructuring. Iframes render this " +
  "document in isolation and do not inherit any fonts or styles from elsewhere, so anything not explicitly included " +
  "here will not render.";

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

// ─── CLAUDE — FULL HTML REWRITE ───
function looksLikeHtmlDocument(text: string): boolean {
  const head = text.trim().slice(0, 200).toLowerCase();
  return head.includes("<html") || head.includes("<!doctype") || head.includes("<body");
}

// A document that starts like HTML but runs out of max_tokens mid-generation
// still passes looksLikeHtmlDocument — checking only the closing tag catches
// that silent truncation instead of saving a broken document as if it succeeded.
function looksComplete(text: string): boolean {
  const tail = text.trim().slice(-30).toLowerCase();
  return tail.includes("</html>");
}

async function generateWithClaude(args: {
  sanitizedHtml: string;
  archetype: string;
  sectionOrder: string[];
  copySelections: Record<string, string>;
}): Promise<{ success: true; html: string } | { success: false; message: string }> {
  const { sanitizedHtml, archetype, sectionOrder, copySelections } = args;
  const userMessage = [
    `Target story archetype: ${archetype || "not specified"}.`,
    `Requested section order (top to bottom): ${sectionOrder.length ? sectionOrder.join(" → ") : "keep current order"}.`,
    `Copy rewrite instructions per section:\n${JSON.stringify(copySelections, null, 2)}`,
    `\nHere is the sanitised site HTML to restructure and rewrite:\n\n${sanitizedHtml}`,
  ].join("\n\n");

  const result = await callAi({
    systemPrompt: GENERATE_VISION_SYSTEM_PROMPT,
    userContent: userMessage,
    maxOutputTokens: 16000,
    timeoutMs: 130_000,
  });
  if (!result.success) {
    console.error("generate-vision: AI call failed", result.message);
    return { success: false, message: result.message };
  }
  const html = result.text.trim();
  if (!html || !looksLikeHtmlDocument(html)) {
    console.error("generate-vision: malformed AI output", html.slice(0, 500));
    return { success: false, message: "The AI did not return a valid HTML document." };
  }
  if (!looksComplete(html)) {
    console.error("generate-vision: output truncated before completion (hit max_tokens)", html.length, html.slice(-200));
    return { success: false, message: "Generation ran out of output budget before finishing the page — the result would have been a broken, cut-off document, so nothing was saved." };
  }
  return { success: true, html };
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

  // A full-page rewrite asks Claude to reproduce the whole document back out, so
  // output size scales with input size. Measured directly against this project:
  // a 240KB real page timed out at effort:medium; a 60KB real page still timed out
  // at effort:low. Output token throughput, not reasoning effort, is the real
  // constraint here — a 60KB reproduction plus edits didn't finish emitting inside
  // Supabase's ~150s per-invocation ceiling. Cut off well below that measured
  // failure point, and fail fast with a specific reason rather than burning the
  // full budget on a page that structurally can't finish.
  const MAX_CLEANED_HTML_BYTES = 35_000;
  if (domResult.html.length > MAX_CLEANED_HTML_BYTES) {
    return fail(
      `This page is too large for a full-page rebuild in one pass (${Math.round(domResult.html.length / 1000)}KB after cleanup, limit ${MAX_CLEANED_HTML_BYTES / 1000}KB). ` +
      "Generating a complete rewritten document requires Claude to reproduce roughly as much output as it reads in, and a page this size can't finish within Supabase's per-invocation time limit.",
    );
  }

  const claudeResult = await generateWithClaude({
    sanitizedHtml: domResult.html,
    archetype,
    sectionOrder,
    copySelections,
  });
  if (claudeResult.success === false) {
    return fail(claudeResult.message);
  }

  const { error: updateError } = await supabase
    .from("vision_generation_jobs")
    .update({ status: "done", html: claudeResult.html, completed_at: new Date().toISOString() })
    .eq("id", jobId);
  if (updateError) console.error("generate-vision: failed to write completed job", updateError.message);
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
