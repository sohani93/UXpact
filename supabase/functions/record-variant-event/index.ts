import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── RECORD-VARIANT-EVENT — Layer 4 (Vision Pro bandit engine) ───
// Public, unauthenticated — the embed script's second call, alongside
// serve-variant. serve-variant logs 'serve' events itself server-side;
// this is the only client-reported event, and only 'convert' is accepted
// from it. Definition of "convert" is intentionally loose per the build
// plan: pulse-pro.js reports this on a click on the primary CTA.
//
// After logging the event, recalculates traffic_weight for every active
// variant of the same audit — on-demand rather than a scheduled job, since
// converts are rare relative to serves and this codebase has no cron
// infrastructure to add for this pass. Weight is a Laplace-smoothed
// conversion rate: score = (converts + 1) / (serves + 2), normalized across
// the active set. With little or no data, every variant's score sits near
// 0.5 and normalizes back to near-even weights — that's the correct,
// expected cold-start behavior, not a bug.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

interface RecordEventPayload {
  deployedVariantId?: string;
  eventType?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  if (req.method !== "POST") return jsonResponse({ recorded: false }, 405);
  if (!supabase) return jsonResponse({ recorded: false }, 200);

  let payload: RecordEventPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ recorded: false }, 400);
  }

  const deployedVariantId = typeof payload.deployedVariantId === "string" ? payload.deployedVariantId : null;
  // Only 'convert' is accepted from the client — 'serve' is always logged
  // server-side by serve-variant itself, never client-reported.
  if (!deployedVariantId || payload.eventType !== "convert") {
    return jsonResponse({ recorded: false }, 400);
  }

  const { error: insertError } = await supabase.from("variant_events").insert({ deployed_variant_id: deployedVariantId, event_type: "convert" });
  if (insertError) {
    console.error("Failed to log convert event:", insertError.message);
    return jsonResponse({ recorded: false }, 200);
  }

  const { data: variantRow } = await supabase
    .from("deployed_variants")
    .select("audit_id")
    .eq("id", deployedVariantId)
    .maybeSingle();
  const auditId = variantRow?.audit_id;
  if (!auditId) return jsonResponse({ recorded: true, rebalanced: false }, 200);

  const { data: activeVariants } = await supabase
    .from("deployed_variants")
    .select("id")
    .eq("audit_id", auditId)
    .eq("is_active", true);
  if (!activeVariants || activeVariants.length === 0) return jsonResponse({ recorded: true, rebalanced: false }, 200);

  const activeIds = activeVariants.map((v) => v.id);
  const { data: events } = await supabase
    .from("variant_events")
    .select("deployed_variant_id, event_type")
    .in("deployed_variant_id", activeIds);

  const counts = new Map<string, { serves: number; converts: number }>();
  for (const id of activeIds) counts.set(id, { serves: 0, converts: 0 });
  for (const ev of events ?? []) {
    const entry = counts.get(ev.deployed_variant_id);
    if (!entry) continue;
    if (ev.event_type === "serve") entry.serves += 1;
    else if (ev.event_type === "convert") entry.converts += 1;
  }

  // Laplace-smoothed conversion rate per variant, normalized across the active set.
  const scores = activeIds.map((id) => {
    const { serves, converts } = counts.get(id)!;
    return { id, score: (converts + 1) / (serves + 2) };
  });
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0) || scores.length;

  await Promise.all(
    scores.map((s) => supabase.from("deployed_variants").update({ traffic_weight: s.score / totalScore }).eq("id", s.id)),
  );

  return jsonResponse({ recorded: true, rebalanced: true }, 200);
});
