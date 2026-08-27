// ─── SELF-CHECK-VISION — Step 2 of 2 for the Vision sandbox ───
// Takes the draft HTML generate-vision (step 1) produced, checks it against
// the audit's actual journey_breaks, and — only if it finds something still
// unresolved — asks Claude to revise before the result is ever returned.
// This is what makes generation "self-checked" per spec: the agent verifies
// its own output against the specific problems it was meant to fix, not
// whatever came out of one pass.
//
// Split into its own edge function (rather than chained inside
// generate-vision) because the full generate+critique+revise chain reliably
// exceeds Supabase Edge Functions' hard ~150s per-invocation wall-clock
// limit — measured directly against this project. Each step now gets its
// own budget. Same job/poll pattern as generate-vision: returns a jobId
// immediately, does the work via EdgeRuntime.waitUntil, frontend polls
// vision_generation_jobs (RLS allows anon SELECT).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function errorResponse(code: string, message: string, status: number): Response {
  return jsonResponse({ error: code, message }, status);
}

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
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

function looksLikeHtmlDocument(text: string): boolean {
  const head = text.trim().slice(0, 200).toLowerCase();
  return head.includes("<html") || head.includes("<!doctype") || head.includes("<body");
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

interface JourneyBreakRow {
  journey_stage: string;
  element: string;
  reason: string;
}

async function fetchJourneyBreaks(auditId: string): Promise<JourneyBreakRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("archetype_consistency_scores")
    .select("journey_stage, element, reason")
    .eq("audit_id", auditId);
  if (error) {
    console.error("self-check-vision: failed to load journey breaks", error.message);
    return [];
  }
  return (data ?? []) as JourneyBreakRow[];
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CRITIQUE_SYSTEM_PROMPT =
  "You are a strict UX QA reviewer. You are given the visible text of a rewritten webpage and a list of specific " +
  "journey breaks that rewrite was supposed to fix. For each break, decide whether the rewritten text actually " +
  "resolves it — not whether it's plausible, but whether the underlying problem (missing element, weak copy, " +
  "wrong framing) is now genuinely fixed. Be skeptical: a superficial rewrite that dodges the actual issue does not count as resolved.";

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

interface CritiqueResult {
  element: string;
  resolved: boolean;
  note: string;
}

async function critiqueDraft(args: { draftText: string; breaks: JourneyBreakRow[] }): Promise<CritiqueResult[] | null> {
  if (!ANTHROPIC_API_KEY || args.breaks.length === 0) return null;
  const userPayload = {
    journey_breaks_to_verify: args.breaks.map((b) => ({ journey_stage: b.journey_stage, element: b.element, original_problem: b.reason })),
    rewritten_page_text: args.draftText.slice(0, 40_000),
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
        system: [{ type: "text", text: CRITIQUE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        output_config: { format: { type: "json_schema", schema: CRITIQUE_SCHEMA } },
        messages: [{ role: "user", content: JSON.stringify(userPayload) }],
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("self-check-vision: critique call failed", response.status, body.slice(0, 500));
      return null;
    }
    const data = await response.json();
    const textBlock = (data.content ?? []).find((b: { type: string }) => b.type === "text");
    if (!textBlock?.text) return null;
    const parsed = JSON.parse(textBlock.text) as { results: CritiqueResult[] };
    return Array.isArray(parsed.results) ? parsed.results : null;
  } catch (error) {
    console.error("self-check-vision: critique call error", error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function reviseDraft(args: {
  draftHtml: string;
  unresolved: CritiqueResult[];
}): Promise<{ success: true; html: string } | { success: false; message: string }> {
  if (!ANTHROPIC_API_KEY) return { success: false, message: "Claude API key is not configured." };
  const { draftHtml, unresolved } = args;
  const userMessage = [
    "Here is a rewritten webpage you produced. A QA pass found that it does NOT actually fix the following specific issues:",
    JSON.stringify(unresolved.map((u) => ({ element: u.element, still_wrong: u.note })), null, 2),
    "\nRevise the HTML to genuinely fix each of these, while preserving everything else about the page (design, CSS, images, layout, and any sections that already passed QA). Return only the complete revised HTML document, nothing else.",
    `\nCurrent HTML:\n\n${draftHtml}`,
  ].join("\n\n");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 145_000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 16000,
        stream: true,
        output_config: { effort: "medium" },
        system: [{ type: "text", text: GENERATE_VISION_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("self-check-vision: revise call failed", response.status, body.slice(0, 500));
      return { success: false, message: `Claude API returned ${response.status} during revision.` };
    }
    const html = (await readStreamedText(response)).trim();
    if (!html || !looksLikeHtmlDocument(html)) {
      console.error("self-check-vision: malformed revise output", html.slice(0, 500));
      return { success: false, message: "Claude did not return a valid revised HTML document." };
    }
    return { success: true, html };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { success: false, message: "Revision timed out." };
    }
    console.error("self-check-vision: revise call error", error);
    return { success: false, message: error instanceof Error ? error.message : "Failed to revise HTML." };
  } finally {
    clearTimeout(timeoutId);
  }
}

interface SelfCheckPayload {
  auditId?: string;
  draftHtml?: string;
}

async function runSelfCheck(jobId: string, payload: SelfCheckPayload): Promise<void> {
  if (!supabase) return;
  const fail = async (message: string) => {
    await supabase.from("vision_generation_jobs").update({ status: "error", error_message: message, completed_at: new Date().toISOString() }).eq("id", jobId);
  };

  const auditId = payload.auditId;
  const draftHtml = payload.draftHtml;
  if (!auditId || !draftHtml) {
    return fail("auditId and draftHtml are required.");
  }

  let finalHtml = draftHtml;
  let selfCheck: { checked: number; unresolvedFound: number; revised: boolean; results: CritiqueResult[] } | null = null;

  const breaks = await fetchJourneyBreaks(auditId);
  if (breaks.length > 0) {
    const draftText = stripHtmlToText(finalHtml);
    const critique = await critiqueDraft({ draftText, breaks });
    if (critique) {
      const unresolved = critique.filter((c) => !c.resolved);
      selfCheck = { checked: critique.length, unresolvedFound: unresolved.length, revised: false, results: critique };
      if (unresolved.length > 0) {
        const revision = await reviseDraft({ draftHtml: finalHtml, unresolved });
        if (revision.success) {
          finalHtml = revision.html;
          selfCheck.revised = true;
        } else {
          console.error("self-check-vision: revision pass failed, returning unrevised draft", revision.message);
        }
      }
    } else {
      console.error("self-check-vision: critique produced no result — returning unchecked draft.");
    }
  }

  const { error: updateError } = await supabase
    .from("vision_generation_jobs")
    .update({ status: "done", html: finalHtml, self_check: selfCheck, completed_at: new Date().toISOString() })
    .eq("id", jobId);
  if (updateError) console.error("self-check-vision: failed to write completed job", updateError.message);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  if (!supabase) return errorResponse("NOT_CONFIGURED", "Supabase is not configured for this function.", 500);

  let payload: SelfCheckPayload;
  try {
    payload = await req.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be JSON", 400);
  }

  if (!payload.auditId || !payload.draftHtml) {
    return errorResponse("MISSING_FIELDS", "auditId and draftHtml are required.", 400);
  }

  const { data: job, error: insertError } = await supabase
    .from("vision_generation_jobs")
    .insert({ audit_id: payload.auditId, status: "pending", stage: "self_check" })
    .select("id")
    .single();
  if (insertError || !job?.id) {
    return errorResponse("JOB_CREATE_FAILED", insertError?.message ?? "Failed to create self-check job.", 500);
  }

  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil(runSelfCheck(job.id, payload));

  return jsonResponse({ jobId: job.id }, 202);
});
