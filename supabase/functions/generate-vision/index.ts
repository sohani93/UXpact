import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── VISION PRO — GENERATE (step 1 of 2) ───
// Conversion Blueprint's Restructured view: takes the user's story
// direction, section order, and copy instructions, sends the real page
// through the DOM-fidelity microservice, then has Claude rewrite it.
// Returns a jobId immediately and does the work via EdgeRuntime.waitUntil —
// Supabase Edge Functions have a hard ~150s per-invocation wall-clock limit
// (measured directly against this project), and a full-page HTML round
// trip is an output-token-bound task that can exceed it even on
// medium-sized real pages. Step 2 (self-check) verifies + revises before
// this is ever shown to the user.
//
// Never writes to vision_versions — saving a version is a separate,
// explicit frontend action.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
function jsonError(code: string, message: string, status: number): Response {
  return json({ error: code, message }, status);
}

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const VISION_SERVICE_URL = Deno.env.get("VISION_SERVICE_URL");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const db = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const VISION_REWRITE_SYSTEM_PROMPT =
  "You are a conversion-focused web designer and copywriter. You receive a real website's HTML and a set of " +
  "instructions. You return a complete, valid, self-contained HTML document — the same site, restructured and " +
  "rewritten per the instructions. Preserve all visual design, CSS, images, and layout. Only change structure and " +
  "copy per the instructions. Never add fictional content. Never remove brand elements. Return only the HTML " +
  "document, nothing else. The <head> of the input HTML may contain <link>/<style> tags that load web fonts or " +
  "other external stylesheets the visual design depends on — carry every one of these over into your output's " +
  "<head> exactly as given, even if the tags don't visibly relate to the sections you're restructuring. Iframes " +
  "render this document in isolation and do not inherit any fonts or styles from elsewhere, so anything not " +
  "explicitly included here will not render.";

interface GenerateVisionPayload {
  auditId?: string;
  archetype?: string;
  sectionOrder?: string[];
  copySelections?: Record<string, string>;
  rawHtml?: string;
}

async function cleanupDom(rawHtml: string, sectionOrder: string[]): Promise<{ ok: true; html: string } | { ok: false; message: string }> {
  if (!VISION_SERVICE_URL) return { ok: false, message: "Vision DOM service is not configured (VISION_SERVICE_URL unset)." };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(VISION_SERVICE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawHtml, sectionOrder }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, message: `DOM service returned ${res.status}: ${body.slice(0, 300)}` };
    }
    const data = await res.json();
    if (!data?.html || typeof data.html !== "string") return { ok: false, message: "DOM service returned no HTML." };
    return { ok: true, html: data.html };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return { ok: false, message: "DOM service timed out." };
    return { ok: false, message: err instanceof Error ? err.message : "Failed to reach DOM service." };
  } finally {
    clearTimeout(timer);
  }
}

function looksLikeHtml(text: string): boolean {
  const head = text.trim().slice(0, 200).toLowerCase();
  return head.includes("<html") || head.includes("<!doctype") || head.includes("<body");
}
// A document that starts like HTML but runs out of max_tokens mid-generation
// still passes looksLikeHtml — checking the closing tag catches that silent
// truncation instead of saving a broken document as if it succeeded.
function looksComplete(text: string): boolean {
  return text.trim().slice(-30).toLowerCase().includes("</html>");
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

async function rewriteWithClaude(args: {
  html: string;
  archetype: string;
  sectionOrder: string[];
  copySelections: Record<string, string>;
}): Promise<{ ok: true; html: string } | { ok: false; message: string }> {
  if (!ANTHROPIC_API_KEY) return { ok: false, message: "Claude API key is not configured for Vision Pro." };

  const { html, archetype, sectionOrder, copySelections } = args;
  const message = [
    `Target story direction: ${archetype || "not specified"}.`,
    `Requested section order (top to bottom): ${sectionOrder.length ? sectionOrder.join(" → ") : "keep current order"}.`,
    `Copy rewrite instructions per section:\n${JSON.stringify(copySelections, null, 2)}`,
    `\nHere is the sanitised site HTML to restructure and rewrite:\n\n${html}`,
  ].join("\n\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 130_000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 16000,
        stream: true,
        // Full-page rewrites are output-token-bound, not reasoning-bound — "low"
        // effort is the real latency lever here, not a quality compromise for
        // this task shape. Measured directly against this project: "medium"
        // still timed out on a 240KB real page at 146s.
        output_config: { effort: "low" },
        system: [{ type: "text", text: VISION_REWRITE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: message }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("generate-vision: Claude API error", res.status, body.slice(0, 500));
      return { ok: false, message: `Claude API returned ${res.status}: ${body.slice(0, 300)}` };
    }
    const html2 = (await collectStreamedText(res)).trim();
    if (!html2 || !looksLikeHtml(html2)) {
      console.error("generate-vision: malformed Claude output", html2.slice(0, 500));
      return { ok: false, message: "Claude did not return a valid HTML document." };
    }
    if (!looksComplete(html2)) {
      console.error("generate-vision: output truncated before completion", html2.length, html2.slice(-200));
      return { ok: false, message: "Generation ran out of output budget before finishing the page — the result would have been a broken, cut-off document, so nothing was saved." };
    }
    return { ok: true, html: html2 };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return { ok: false, message: "Generation timed out." };
    console.error("generate-vision: Claude call failed", err);
    return { ok: false, message: err instanceof Error ? err.message : "Failed to generate HTML." };
  } finally {
    clearTimeout(timer);
  }
}

async function runGeneration(jobId: string, payload: GenerateVisionPayload): Promise<void> {
  if (!db) return;
  const fail = (message: string) => db.from("vision_generation_jobs").update({ status: "error", error_message: message, completed_at: new Date().toISOString() }).eq("id", jobId);

  const rawHtml = payload.rawHtml;
  if (!rawHtml || typeof rawHtml !== "string") { await fail("rawHtml is required — this audit predates raw HTML capture."); return; }

  const archetype = typeof payload.archetype === "string" ? payload.archetype : "";
  const sectionOrder = Array.isArray(payload.sectionOrder) ? payload.sectionOrder.filter((s): s is string => typeof s === "string") : [];
  const copySelections = payload.copySelections && typeof payload.copySelections === "object" ? payload.copySelections : {};

  const cleaned = await cleanupDom(rawHtml, sectionOrder);
  if (!cleaned.ok) { await fail(cleaned.message); return; }

  // A full-page rewrite must reproduce roughly as much output as it reads in.
  // Measured directly against this project: a 240KB page timed out at
  // effort:medium; a 60KB page still timed out at effort:low. Cut off well
  // below the measured failure point and fail fast with a specific reason
  // rather than burning the full budget on a page that can't finish.
  const MAX_CLEANED_HTML_BYTES = 35_000;
  if (cleaned.html.length > MAX_CLEANED_HTML_BYTES) {
    await fail(
      `This page is too large for a full-page rebuild in one pass (${Math.round(cleaned.html.length / 1000)}KB after cleanup, limit ${MAX_CLEANED_HTML_BYTES / 1000}KB). ` +
      "Generating a complete rewritten document requires Claude to reproduce roughly as much output as it reads in, and a page this size can't finish within Supabase's per-invocation time limit.",
    );
    return;
  }

  const rewritten = await rewriteWithClaude({ html: cleaned.html, archetype, sectionOrder, copySelections });
  if (!rewritten.ok) { await fail(rewritten.message); return; }

  const { error } = await db.from("vision_generation_jobs").update({ status: "done", html: rewritten.html, completed_at: new Date().toISOString() }).eq("id", jobId);
  if (error) console.error("generate-vision: failed to write completed job", error.message);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS, status: 204 });
  if (req.method !== "POST") return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  if (!db) return jsonError("NOT_CONFIGURED", "Supabase is not configured for this function.", 500);

  let payload: GenerateVisionPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonError("INVALID_JSON", "Request body must be JSON", 400);
  }

  if (!payload.rawHtml || typeof payload.rawHtml !== "string") {
    return jsonError("MISSING_RAW_HTML", "rawHtml is required — this audit predates raw HTML capture.", 400);
  }

  const auditId = typeof payload.auditId === "string" ? payload.auditId : null;
  const { data: job, error } = await db.from("vision_generation_jobs").insert({ audit_id: auditId, status: "pending", stage: "generate" }).select("id").single();
  if (error || !job?.id) return jsonError("JOB_CREATE_FAILED", error?.message ?? "Failed to create generation job.", 500);

  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil(runGeneration(job.id, payload));

  return json({ jobId: job.id }, 202);
});
