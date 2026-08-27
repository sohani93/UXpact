-- ─── LAYER 3: DRIFT MONITOR ─────────────────────────────────────────────────
-- site_snapshots holds the "last known state" Pulse Pro's embed script
-- checks the live DOM against — one row per audit, upserted on every check.
-- Not in the original brief's schema list; needed to make "periodically
-- checks against the last known state" concrete. zone_fingerprints is
-- intentionally coarse (per-zone word count + text length, not a real
-- diff) — cheap enough to compare on every throttled check.
--
-- drift_events is logged only when a journey stage's conflict_severity
-- (1-5 scale, from archetype_consistency_scores) rises by 1 or more.
-- suggested_variant_id stays null in this pass — detect + log + surface
-- only, no autonomous Claude generation triggered by live traffic.
--
-- Already live in production — IF NOT EXISTS makes this a no-op there and a
-- real create on a fresh database or Supabase preview branch.

CREATE TABLE IF NOT EXISTS site_snapshots (
  audit_id UUID REFERENCES audits(id) PRIMARY KEY,
  domain TEXT,
  zone_fingerprints JSONB,
  last_checked_at TIMESTAMPTZ DEFAULT now(),
  last_full_check_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS drift_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID REFERENCES audits(id),
  domain TEXT,
  element TEXT,
  severity_delta INTEGER,
  detected_at TIMESTAMPTZ DEFAULT now(),
  suggested_variant_id UUID REFERENCES deployed_variants(id)
);
