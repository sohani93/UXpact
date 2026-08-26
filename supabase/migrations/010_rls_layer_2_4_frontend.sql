-- ─── RLS: LAYER 2-4 FRONTEND ACCESS ────────────────────────────────────────
-- 005_enable_rls.sql locked vision_versions, deployed_variants, drift_events,
-- and variant_events to zero policies, correct for the frontend live at the
-- time (none of it touched these tables directly). The unmerged Blueprint
-- Restructured-tab branch does, with the anon key, in these exact shapes:
--   - vision_versions:   SELECT (version history) + INSERT (save version)
--   - drift_events:      SELECT (Drift Monitor list)
--   - deployed_variants: SELECT (id, traffic_weight) + UPDATE (is_active —
--                         this is literally how the Rollback button works)
--   - variant_events:    SELECT (serve/convert counts per variant)
-- Adding these now, ahead of that frontend merging, so nothing silently
-- breaks (empty Drift Monitor, failed Rollback, blank version history) the
-- moment it ships. No INSERT policy on deployed_variants/drift_events/
-- variant_events — those are written only by service-role Edge Functions
-- (deploy-variant, check-drift, serve-variant, record-variant-event), which
-- bypass RLS regardless of policy.

CREATE POLICY "Public can view vision versions" ON public.vision_versions
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public can save vision versions" ON public.vision_versions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public can view drift events" ON public.drift_events
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public can view deployed variants" ON public.deployed_variants
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public can rollback deployed variants" ON public.deployed_variants
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public can view variant events" ON public.variant_events
  FOR SELECT TO anon, authenticated USING (true);
