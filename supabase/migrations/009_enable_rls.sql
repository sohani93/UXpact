-- ─── ENABLE ROW LEVEL SECURITY ────────────────────────────────────────────
-- All 12 public tables were fully exposed to the anon/authenticated roles
-- (RLS disabled) — anyone with the publishable key could read or write every
-- row. This turns RLS on everywhere and adds only the policies the actual
-- anon-key call sites need (traced across all 5 edge functions and every
-- engine-ui / pulse-extension client call). Edge functions use the
-- service-role key, which bypasses RLS regardless of policies, so nothing
-- here changes their behavior.

ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployed_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deploy_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archetype_consistency_scores ENABLE ROW LEVEL SECURITY;

-- ─── audits: public read + insert of new submissions ──────────────────────
-- No UPDATE/DELETE policy — nothing in the app modifies an existing audit
-- row from the client.
CREATE POLICY "Public can view audits" ON public.audits
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public can submit new audits" ON public.audits
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ─── audit_findings: public read + insert + Pulse completion toggle ───────
CREATE POLICY "Public can view findings" ON public.audit_findings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public can submit findings" ON public.audit_findings
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public can update finding completion" ON public.audit_findings
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ─── everything else: RLS enabled, no policies ─────────────────────────────
-- vision_versions, pulse_checklists, pulse_items, deployed_variants,
-- deploy_snapshots, drift_events, site_snapshots, variant_events,
-- variant_outcomes, archetype_consistency_scores — no anon/authenticated
-- policy is added, so these are fully closed to the client.
--
-- vision_versions is here deliberately, not by omission: generate-vision's
-- code comment claims the frontend inserts into it directly, but that
-- insert code could not be found in this repo checkout, so it stays locked
-- until that's confirmed rather than opening it on an unverified claim.
-- Every read/write to the rest of this group happens via a service-role
-- edge function, which bypasses RLS.
