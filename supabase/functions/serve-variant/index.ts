import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── SERVE-VARIANT — Layer 2 (Pulse Pro), extended in Layer 4 (Vision Pro) ───
// Public, unauthenticated, on the critical path for every page load of any
// site that installs the Pulse Pro embed script. There's no auth because
// serving this content publicly to site visitors is the feature, not a leak.
//
// Layer 4: an audit can now have more than one active variant (a live bandit
// test). This picks one per visitor via weighted random selection over
// traffic_weight (a single active variant is always picked — same behavior
// as before Layer 4) and logs a 'serve' event for it, so real serve counts
// accumulate from day one even for ordinary single-variant deploys.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Layer 3 — how often the embed script is asked to report a drift
// fingerprint. Read-only here (serve-variant never writes); check-drift
// is what actually advances last_checked_at once it processes a report.
const DRIFT_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

interface ActiveVariant {
  id: string;
  variant_html: Record<string, string> | null;
  traffic_weight: number | null;
}

// Weighted random selection — a single variant is always picked (matches
// pre-Layer-4 behavior exactly). With 2+, each variant's chance of being
// picked is proportional to its traffic_weight.
function pickWeighted(variants: ActiveVariant[]): ActiveVariant {
  if (variants.length === 1) return variants[0];
  const totalWeight = variants.reduce((sum, v) => sum + (v.traffic_weight ?? 1), 0) || variants.length;
  let r = Math.random() * totalWeight;
  for (const v of variants) {
    r -= v.traffic_weight ?? 1;
    if (r <= 0) return v;
  }
  return variants[variants.length - 1];
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });

  let auditId: string | null = null;
  if (req.method === "GET") {
    auditId = new URL(req.url).searchParams.get("auditId");
  } else if (req.method === "POST") {
    try {
      const body = await req.json();
      auditId = typeof body?.auditId === "string" ? body.auditId : null;
    } catch {
      // fall through to the missing-auditId response below
    }
  } else {
    return jsonResponse({ sections: null }, 405);
  }

  if (!auditId || !supabase) {
    return jsonResponse({ sections: null, driftCheckDue: false }, 200);
  }

  const [{ data: activeVariants, error }, { data: snapshot }] = await Promise.all([
    supabase
      .from("deployed_variants")
      .select("id, variant_html, traffic_weight")
      .eq("audit_id", auditId)
      .eq("is_active", true),
    supabase
      .from("site_snapshots")
      .select("last_checked_at")
      .eq("audit_id", auditId)
      .maybeSingle(),
  ]);

  const driftCheckDue =
    !snapshot?.last_checked_at ||
    Date.now() - new Date(snapshot.last_checked_at).getTime() > DRIFT_CHECK_INTERVAL_MS;

  if (error || !activeVariants || activeVariants.length === 0) {
    return jsonResponse({ sections: null, deployedVariantId: null, driftCheckDue }, 200);
  }

  const picked = pickWeighted(activeVariants);

  // Fire-and-await (fast single insert) so the serve count is accurate for
  // record-variant-event's weight recalculation later. A failure here must
  // never block serving the variant itself.
  const { error: eventError } = await supabase.from("variant_events").insert({ deployed_variant_id: picked.id, event_type: "serve" });
  if (eventError) console.error("Failed to log serve event:", eventError.message);

  return jsonResponse({ sections: picked.variant_html ?? null, deployedVariantId: picked.id, driftCheckDue }, 200);
});
