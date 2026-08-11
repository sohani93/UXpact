// ─── UXPACT VISION SANDBOX — generate-vision Edge Function ───
// Accepts a user's Vision sandbox choices, sends the real site HTML through
// the Python DOM-fidelity microservice, then has Claude rewrite/restructure
// it per those choices. Returns the complete regenerated HTML document.
//
// Never writes to Supabase — saving a version is a separate, explicit
// frontend action (POST to vision_versions directly via the client).

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
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const VISION_SERVICE_URL = Deno.env.get("VISION_SERVICE_URL");

const GENERATE_VISION_SYSTEM_PROMPT =
  "You are a conversion-focused web designer and copywriter. You receive a real website's HTML and a set of instructions. " +
  "You return a complete, valid, self-contained HTML document — the same site, restructured and rewritten per the instructions. " +
  "Preserve all visual design, CSS, images, and layout. Only change structure and copy per the instructions. " +
  "Never add fictional content. Never remove brand elements. Return only the HTML document, nothing else.";

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

async function generateWithClaude(args: {
  sanitizedHtml: string;
  archetype: string;
  sectionOrder: string[];
  copySelections: Record<string, string>;
}): Promise<{ success: true; html: string } | { success: false; message: string }> {
  if (!ANTHROPIC_API_KEY) {
    return { success: false, message: "Claude API key is not configured for the Vision sandbox." };
  }

  const { sanitizedHtml, archetype, sectionOrder, copySelections } = args;
  const userMessage = [
    `Target story archetype: ${archetype || "not specified"}.`,
    `Requested section order (top to bottom): ${sectionOrder.length ? sectionOrder.join(" → ") : "keep current order"}.`,
    `Copy rewrite instructions per section:\n${JSON.stringify(copySelections, null, 2)}`,
    `\nHere is the sanitised site HTML to restructure and rewrite:\n\n${sanitizedHtml}`,
  ].join("\n\n");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 8000,
        system: [{ type: "text", text: GENERATE_VISION_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("generate-vision: Claude API error", response.status, body.slice(0, 500));
      return { success: false, message: `Claude API returned ${response.status}.` };
    }
    const data = await response.json();
    const textBlock = (data.content ?? []).find((b: { type: string }) => b.type === "text");
    const html = textBlock?.text?.trim() ?? "";
    if (!html || !looksLikeHtmlDocument(html)) {
      console.error("generate-vision: malformed Claude output", html.slice(0, 500));
      return { success: false, message: "Claude did not return a valid HTML document." };
    }
    return { success: true, html };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { success: false, message: "Generation timed out." };
    }
    console.error("generate-vision: Claude call failed", error);
    return { success: false, message: error instanceof Error ? error.message : "Failed to generate HTML." };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── MAIN HANDLER ───
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);

  let payload: GenerateVisionPayload;
  try {
    payload = await req.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be JSON", 400);
  }

  const rawHtml = payload.rawHtml;
  if (!rawHtml || typeof rawHtml !== "string") {
    return errorResponse("MISSING_RAW_HTML", "rawHtml is required — this audit predates raw HTML capture.", 400);
  }

  const archetype = typeof payload.archetype === "string" ? payload.archetype : "";
  const sectionOrder = Array.isArray(payload.sectionOrder) ? payload.sectionOrder.filter((s): s is string => typeof s === "string") : [];
  const copySelections = payload.copySelections && typeof payload.copySelections === "object" ? payload.copySelections : {};

  const domResult = await processWithMicroservice(rawHtml, sectionOrder);
  if (domResult.success === false) {
    return errorResponse("MICROSERVICE_UNREACHABLE", domResult.message, 502);
  }

  const claudeResult = await generateWithClaude({
    sanitizedHtml: domResult.html,
    archetype,
    sectionOrder,
    copySelections,
  });
  if (claudeResult.success === false) {
    return errorResponse("GENERATION_FAILED", claudeResult.message, 502);
  }

  return jsonResponse({ html: claudeResult.html }, 200);
});
