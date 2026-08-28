import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── VISION PRO — SELF-CHECK (step 2 of 2) ───
// Takes the draft from generate-vision (step 1), checks it against the
// audit's real journey breaks, and — only if something is still
// unresolved — asks Claude to revise before the result is ever shown.
// This is what makes generation self-checked per spec: the agent verifies
// its own output against the specific problems it was meant to fix.
//
// Its own edge function (rather than chained inside generate-vision)
// because the full generate+critique+revise chain reliably exceeds
// Supabase's hard ~150s per-invocation wall-clock limit. Same job/poll
// pattern as generate-vision.

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
  "<head> exactly as given. Iframes render this document in isolation and do not inherit any fonts or styles from " +
  "elsewhere, so anything not explicitly included here will not render.";

function looksLikeHtml(text: string): boolean {
  const head = text.trim().slice(0, 200).toLowerCase();
  return head.includes("<html") || head.includes("<!doctype") || head.includes("<body");
}
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

interface JourneyBreakRow { journey_stage: string; element: string; reason: string }

async function loadJourneyBreaks(auditId: string): Promise<JourneyBreakRow[]> {
  if (!db) return [];
  const { data, error } = await db.from("archetype_consistency_scores").select("journey_stage, element, reason").eq("audit_id", auditId);
  if (error) { console.error("self-check-vision: failed to load journey breaks", error.message); return []; }
  return (data ?? []) as JourneyBreakRow[];
}

function stripToText(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const CRITIQUE_SYSTEM_PROMPT =
  "You are a strict UX QA reviewer. You are given the visible text of a rewritten webpage and a list of specific " +
  "journey breaks that rewrite was supposed to fix. For each break, decide whether the rewritten text actually " +
  "resolves it — not whether it's plausible, but whether the underlying problem (missing element, weak copy, wrong " +
  "framing) is now genuinely fixed. Be skeptical: a superficial rewrite that dodges the actual issue does not count as resolved.";

const CRITIQUE_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          element: { type: "string" },
          resolved: { type: "boolean" },
          note: { type: "string", description: "One sentence: why resolved, or exactly what's still missing." },
        },
        required: ["element", "resolved", "note"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
};

interface CritiqueResult { element: string; resolved: boolean; note: string }

async function critiqueDraft(args: { draftText: string; breaks: JourneyBreakRow[] }): Promise<CritiqueResult[] | null> {
  if (!ANTHROPIC_API_KEY || args.breaks.length === 0) return null;
  const payload = {
    journey_breaks_to_verify: args.breaks.map((b) => ({ journey_stage: b.journey_stage, element: b.element, original_problem: b.reason })),
    rewritten_page_text: args.draftText.slice(0, 40_000),
  };
  const controller = new AbortController();
  // Kept tight and streamed: critique runs before reviseDraft in the same
  // background invocation, and both share Supabase's single ~150s ceiling.
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 2000,
        stream: true,
        output_config: { effort: "low", format: { type: "json_schema", schema: CRITIQUE_SCHEMA } },
        system: [{ type: "text", text: CRITIQUE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: JSON.stringify(payload) }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("self-check-vision: critique call failed", res.status, body.slice(0, 500));
      return null;
    }
    const text = await collectStreamedText(res);
    if (!text) return null;
    const parsed = JSON.parse(text) as { results: CritiqueResult[] };
    return Array.isArray(parsed.results) ? parsed.results : null;
  } catch (err) {
    console.error("self-check-vision: critique call error", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function reviseDraft(args: { draftHtml: string; unresolved: CritiqueResult[] }): Promise<{ ok: true; html: string } | { ok: false; message: string }> {
  if (!ANTHROPIC_API_KEY) return { ok: false, message: "Claude API key is not configured." };
  const { draftHtml, unresolved } = args;
  const message = [
    "Here is a rewritten webpage you produced. A QA pass found that it does NOT actually fix the following specific issues:",
    JSON.stringify(unresolved.map((u) => ({ element: u.element, still_wrong: u.note })), null, 2),
    "\nRevise the HTML to genuinely fix each of these, while preserving everything else about the page (design, CSS, images, layout, and any sections that already passed QA). Return only the complete revised HTML document, nothing else.",
    `\nCurrent HTML:\n\n${draftHtml}`,
  ].join("\n\n");

  const controller = new AbortController();
  // Budgeted so critique (up to 30s) + revise together stay under Supabase's
  // ~150s per-invocation ceiling with margin, not just revise alone.
  const timer = setTimeout(() => controller.abort(), 110_000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 16000,
        stream: true,
        output_config: { effort: "low" },
        system: [{ type: "text", text: VISION_REWRITE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: message }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("self-check-vision: revise call failed", res.status, body.slice(0, 500));
      return { ok: false, message: `Claude API returned ${res.status} during revision.` };
    }
    const html = (await collectStreamedText(res)).trim();
    if (!html || !looksLikeHtml(html)) {
      console.error("self-check-vision: malformed revise output", html.slice(0, 500));
      return { ok: false, message: "Claude did not return a valid revised HTML document." };
    }
    if (!looksComplete(html)) {
      console.error("self-check-vision: revised output truncated before completion", html.length, html.slice(-200));
      return { ok: false, message: "Revision ran out of output budget before finishing the page — the result would have been a broken, cut-off document, so the unrevised draft was kept instead." };
    }
    return { ok: true, html };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return { ok: false, message: "Revision timed out." };
    console.error("self-check-vision: revise call error", err);
    return { ok: false, message: err instanceof Error ? err.message : "Failed to revise HTML." };
  } finally {
    clearTimeout(timer);
  }
}

interface SelfCheckPayload { auditId?: string; draftHtml?: string }

async function runSelfCheck(jobId: string, payload: SelfCheckPayload): Promise<void> {
  if (!db) return;
  const fail = (message: string) => db.from("vision_generation_jobs").update({ status: "error", error_message: message, completed_at: new Date().toISOString() }).eq("id", jobId);

  const auditId = payload.auditId;
  const draftHtml = payload.draftHtml;
  if (!auditId || !draftHtml) { await fail("auditId and draftHtml are required."); return; }

  let finalHtml = draftHtml;
  let selfCheck: { checked: number; unresolvedFound: number; revised: boolean; results: CritiqueResult[] } | null = null;

  const breaks = await loadJourneyBreaks(auditId);
  if (breaks.length > 0) {
    const critique = await critiqueDraft({ draftText: stripToText(finalHtml), breaks });
    if (critique) {
      const unresolved = critique.filter((c) => !c.resolved);
      selfCheck = { checked: critique.length, unresolvedFound: unresolved.length, revised: false, results: critique };
      if (unresolved.length > 0) {
        const revision = await reviseDraft({ draftHtml: finalHtml, unresolved });
        if (revision.ok) { finalHtml = revision.html; selfCheck.revised = true; }
        else console.error("self-check-vision: revision pass failed, returning unrevised draft", revision.message);
      }
    } else {
      console.error("self-check-vision: critique produced no result — returning unchecked draft.");
    }
  }

  const { error } = await db.from("vision_generation_jobs").update({ status: "done", html: finalHtml, self_check: selfCheck, completed_at: new Date().toISOString() }).eq("id", jobId);
  if (error) console.error("self-check-vision: failed to write completed job", error.message);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS, status: 204 });
  if (req.method !== "POST") return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  if (!db) return jsonError("NOT_CONFIGURED", "Supabase is not configured for this function.", 500);

  let payload: SelfCheckPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonError("INVALID_JSON", "Request body must be JSON", 400);
  }
  if (!payload.auditId || !payload.draftHtml) return jsonError("MISSING_FIELDS", "auditId and draftHtml are required.", 400);

  const { data: job, error } = await db.from("vision_generation_jobs").insert({ audit_id: payload.auditId, status: "pending", stage: "self_check" }).select("id").single();
  if (error || !job?.id) return jsonError("JOB_CREATE_FAILED", error?.message ?? "Failed to create self-check job.", 500);

  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil(runSelfCheck(job.id, payload));

  return json({ jobId: job.id }, 202);
});
