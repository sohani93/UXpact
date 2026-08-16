-- ─── LAYER 2: PULSE PRO DEPLOY ──────────────────────────────────────────────
-- Stores the currently-live variant (if any) per audit, sectioned by DOM
-- zone so the Pulse Pro embed script can swap only the targeted sections on
-- a real visitor's page rather than replacing the whole document.
-- deploy_snapshots is the historical pre-deploy record (used for a future
-- before/after view) — rollback itself just flips is_active to false, since
-- the live site's real HTML never changes server-side; the embed script is
-- the only thing that ever mutates it, and only while a variant is active.

CREATE TABLE deployed_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID REFERENCES audits(id),
  domain TEXT,
  variant_html JSONB,
  is_active BOOLEAN DEFAULT true,
  deployed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE deploy_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deployed_variant_id UUID REFERENCES deployed_variants(id),
  pre_deploy_html JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
