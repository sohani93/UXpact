import { DOMParser, type Element } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── DEPLOY-VARIANT — Layer 2 (Pulse Pro) ───
// Takes a just-generated Blueprint variant + the original audit HTML,
// extracts the user-targeted DOM zones from each (via the same zone
// heuristic vision-service uses in Python, ported here so this stays in
// Deno rather than requiring another manual Vercel redeploy), and stores
// the sectioned fragments as the audit's active deployed variant. The
// pre-deploy fragments are kept as a historical snapshot — rollback itself
// is just flipping is_active off, since the live site's real HTML never
// changes server-side; the embed script is the only thing that ever
// mutates it, and only while a variant is active.

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

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

// ─── ZONE HEURISTIC — ported from vision-service/api/index.py's classify_zone ───
const ZONE_KEYWORDS: Record<string, string[]> = {
  nav: ["nav", "navbar", "menu", "header-top", "site-header"],
  hero: ["hero", "banner", "jumbotron", "masthead", "intro"],
  pricing: ["pricing", "plans", "price-table", "price-grid"],
  social: ["testimonial", "logos", "trust", "social-proof", "customers", "reviews", "clients"],
  cta2: ["cta", "get-started", "signup-section", "bottom-cta", "final-cta"],
  footer: ["footer", "site-footer"],
  features: ["feature", "benefit", "services"],
};

function classifyZone(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (tag === "nav" || tag === "header") return "nav";
  if (tag === "footer") return "footer";
  const haystack = [tag, el.id ?? "", el.className ?? ""].filter(Boolean).join(" ").toLowerCase();
  for (const [zone, keywords] of Object.entries(ZONE_KEYWORDS)) {
    if (keywords.some((kw) => haystack.includes(kw))) return zone;
  }
  if (el.querySelector("h1")) return "hero";
  return "features";
}

function extractZoneFragments(html: string, targetZones: string[]): Record<string, string> {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return {};
  const root = doc.querySelector("main") ?? doc.body;
  if (!root) return {};
  const blocks = Array.from(root.children) as Element[];
  const fragments: Record<string, string> = {};
  for (const block of blocks) {
    const zone = classifyZone(block);
    if (targetZones.includes(zone) && !fragments[zone]) {
      fragments[zone] = block.outerHTML;
    }
  }
  return fragments;
}

interface DeployPayload {
  auditId?: string;
  domain?: string;
  generatedHtml?: string;
  rawHtml?: string;
  zones?: string[];
  multiArmed?: boolean;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  if (!supabase) return errorResponse("NOT_CONFIGURED", "Supabase is not configured for this function.", 500);

  let payload: DeployPayload;
  try {
    payload = await req.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be JSON", 400);
  }

  const { auditId, domain, generatedHtml, rawHtml } = payload;
  const zones = Array.isArray(payload.zones) ? payload.zones.filter((z): z is string => typeof z === "string") : [];
  const multiArmed = payload.multiArmed === true;

  if (!auditId || !generatedHtml || !rawHtml || zones.length === 0) {
    return errorResponse("MISSING_FIELDS", "auditId, generatedHtml, rawHtml, and at least one zone are required.", 400);
  }

  let variantFragments: Record<string, string>;
  let preDeployFragments: Record<string, string>;
  try {
    variantFragments = extractZoneFragments(generatedHtml, zones);
    preDeployFragments = extractZoneFragments(rawHtml, zones);
  } catch (err) {
    return errorResponse("EXTRACTION_FAILED", err instanceof Error ? err.message : "Failed to parse HTML for zone extraction.", 422);
  }

  if (Object.keys(variantFragments).length === 0) {
    return errorResponse("NO_ZONES_MATCHED", "None of the requested zones could be identified in the generated HTML.", 422);
  }

  // Layer 2 default: replace whatever was live — only one active variant per audit.
  // Layer 4 (multiArmed): leave existing active variants running and add this
  // one alongside them, so a bandit test has more than one arm to compare.
  if (!multiArmed) {
    const { error: deactivateError } = await supabase
      .from("deployed_variants")
      .update({ is_active: false })
      .eq("audit_id", auditId)
      .eq("is_active", true);
    if (deactivateError) return errorResponse("DEACTIVATE_FAILED", deactivateError.message, 500);
  }

  const { data: variantRow, error: insertError } = await supabase
    .from("deployed_variants")
    .insert({ audit_id: auditId, domain: domain ?? null, variant_html: variantFragments, is_active: true, traffic_weight: 1 })
    .select("id")
    .single();
  if (insertError || !variantRow?.id) return errorResponse("DEPLOY_FAILED", insertError?.message ?? "Failed to store deployed variant.", 500);

  const { error: snapshotError } = await supabase
    .from("deploy_snapshots")
    .insert({ deployed_variant_id: variantRow.id, pre_deploy_html: preDeployFragments });
  if (snapshotError) console.error("Failed to store deploy snapshot:", snapshotError.message);

  // Rebalance to equal weight across every active variant for this audit —
  // "start all variants at equal weight" per the build plan. With !multiArmed
  // this is always exactly one row (weight 1), so it's a no-op for the
  // existing Layer 2/3 single-variant flow.
  if (multiArmed) {
    const { data: activeVariants, error: activeError } = await supabase
      .from("deployed_variants")
      .select("id")
      .eq("audit_id", auditId)
      .eq("is_active", true);
    if (!activeError && activeVariants && activeVariants.length > 0) {
      const equalWeight = 1 / activeVariants.length;
      await Promise.all(
        activeVariants.map((v) => supabase.from("deployed_variants").update({ traffic_weight: equalWeight }).eq("id", v.id)),
      );
    }
  }

  const embedSnippet = `<script src="https://uxpact.pages.dev/pulse-pro.js" data-uxpact-audit="${auditId}" async></script>`;

  return jsonResponse({ deployedVariantId: variantRow.id, embedSnippet }, 200);
});
