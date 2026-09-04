// ─── SHARED AI CLIENT ───
// The one function every AI call in this codebase goes through (run-audit's
// diagnosis, self-check-vision's critique+revise, generate-vision's rewrite,
// check-drift's re-diagnosis+regression reasoning). Callers pass a system
// prompt, user content, an output budget, and an optional JSON schema for
// structured output — everything provider-specific (request shape, response
// parsing, auth) lives only in here.
//
// Provider: Google Gemini via a free Google AI Studio key (GEMINI_API_KEY) —
// swapped in for Anthropic because the project's Anthropic account ran out
// of credits. Nothing else in this file assumes Anthropic; swapping provider
// again later only means editing this file.
//
// Model: gemini-2.5-flash was the intended target, but as of this key's
// activation the live API rejects it with a 404 ("no longer available to
// new users") and names gemini-3.6-flash as the replacement — confirmed
// directly against the real API, not assumed. Using that instead.

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-3.6-flash";

// Written onto the audits row (and any future caller that wants it) so it's
// always clear which provider/model actually produced a given result.
export const AI_PROVIDER_LABEL = `gemini-${GEMINI_MODEL.replace(/^gemini-/, "")}`;

// deno-lint-ignore no-explicit-any
type JsonSchema = Record<string, any>;

export interface AiCallOptions {
  systemPrompt: string;
  userContent: string;
  maxOutputTokens: number;
  timeoutMs: number;
  /** When set, the response must satisfy this JSON Schema and `text` is the raw JSON string. Omit for plain-text output (e.g. a full HTML document). */
  jsonSchema?: JsonSchema;
}

export type AiCallResult =
  | { success: true; text: string; provider: string; model: string }
  | { success: false; message: string; provider: string; model: string };

// Gemini's responseSchema is a constrained subset of OpenAPI's Schema object:
// uppercase `type` enum values, and no `additionalProperties`. Callers keep
// writing ordinary JSON Schema (as they did for Anthropic) — this converts it.
function toGeminiSchema(schema: JsonSchema): JsonSchema {
  const TYPE_MAP: Record<string, string> = {
    string: "STRING", number: "NUMBER", integer: "INTEGER",
    boolean: "BOOLEAN", array: "ARRAY", object: "OBJECT", null: "NULL",
  };
  function convert(node: JsonSchema): JsonSchema {
    if (node === null || typeof node !== "object") return node;
    const out: JsonSchema = {};
    for (const [key, value] of Object.entries(node)) {
      if (key === "additionalProperties") continue;
      if (key === "type" && typeof value === "string") {
        out.type = TYPE_MAP[value] ?? value.toUpperCase();
      } else if (key === "properties" && value && typeof value === "object") {
        out.properties = Object.fromEntries(Object.entries(value as JsonSchema).map(([k, v]) => [k, convert(v as JsonSchema)]));
      } else if (key === "items") {
        out.items = convert(value as JsonSchema);
      } else {
        out[key] = value;
      }
    }
    return out;
  }
  return convert(schema);
}

async function callAiOnce(opts: AiCallOptions): Promise<AiCallResult & { status?: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    // deno-lint-ignore no-explicit-any
    const generationConfig: Record<string, any> = { maxOutputTokens: opts.maxOutputTokens };
    if (opts.jsonSchema) {
      generationConfig.responseMimeType = "application/json";
      generationConfig.responseSchema = toGeminiSchema(opts.jsonSchema);
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: opts.systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: opts.userContent }] }],
          generationConfig,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { success: false, message: `Gemini API returned ${response.status}: ${body.slice(0, 800)}`, provider: "gemini", model: GEMINI_MODEL, status: response.status };
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    // deno-lint-ignore no-explicit-any
    const text = (candidate?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
    if (!text) {
      const reason = candidate?.finishReason ?? "unknown";
      return { success: false, message: `Gemini returned no text (finishReason: ${reason}).`, provider: "gemini", model: GEMINI_MODEL };
    }

    return { success: true, text, provider: "gemini", model: GEMINI_MODEL };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { success: false, message: "Request to Gemini timed out.", provider: "gemini", model: GEMINI_MODEL };
    }
    return { success: false, message: error instanceof Error ? error.message : "Failed to call Gemini.", provider: "gemini", model: GEMINI_MODEL };
  } finally {
    clearTimeout(timeoutId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The one entry point for every AI call in this codebase. Non-streaming:
 * Gemini's flash tier is fast enough that Supabase's ~150s per-invocation
 * ceiling isn't at risk the way it was with Anthropic's larger models, so
 * this stays simple rather than replicating the old SSE-streaming parser.
 *
 * One automatic retry on a 503 ("model overloaded"), a timeout, or a 429
 * ("quota exceeded") — confirmed via real production calls that all three
 * are genuine transient conditions on Gemini's free flash tier: a 503
 * "high demand" response, a per-section generate-vision call that hit its
 * own timeout under otherwise-identical conditions to a call that
 * succeeded seconds later, and a 429 naming a free-tier request-rate
 * quota ("limit: 5... Please retry in ~19s") from concurrent per-section
 * calls. None of these should count as a real failure on the first
 * occurrence. The 429 case waits out the API's own suggested retry delay
 * (falling back to 20s) before retrying — an immediate retry would just
 * hit the same still-open quota window again.
 */
export async function callAi(opts: AiCallOptions): Promise<AiCallResult> {
  if (!GEMINI_API_KEY) {
    return { success: false, message: "GEMINI_API_KEY is not configured.", provider: "gemini", model: GEMINI_MODEL };
  }

  const first = await callAiOnce(opts);
  if (first.success) return first;

  const isTimeout = first.message === "Request to Gemini timed out.";
  const isRateLimited = first.status === 429;
  if (first.status !== 503 && !isTimeout && !isRateLimited) return first;

  if (isRateLimited) {
    const match = first.message.match(/retry in ([\d.]+)s/i);
    const suggestedMs = match ? Math.ceil(parseFloat(match[1]) * 1000) : 20_000;
    await sleep(Math.min(suggestedMs, 25_000));
  }

  const retry = await callAiOnce(opts);
  return retry;
}
