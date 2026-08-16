import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── SERVE-VARIANT — Layer 2 (Pulse Pro) ───
// Public, unauthenticated, on the critical path for every page load of any
// site that installs the Pulse Pro embed script. Kept deliberately minimal:
// one indexed lookup, no joins, no data beyond the sectioned HTML fragments
// this specific audit_id has deployed. There's no auth because serving
// this content publicly to site visitors is the feature, not a leak.

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
    return jsonResponse({ sections: null }, 200);
  }

  const { data, error } = await supabase
    .from("deployed_variants")
    .select("variant_html")
    .eq("audit_id", auditId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return jsonResponse({ sections: null }, 200);
  }

  return jsonResponse({ sections: data.variant_html ?? null }, 200);
});
