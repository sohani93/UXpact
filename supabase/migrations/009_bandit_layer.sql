-- ─── LAYER 4: VISION PRO (BANDIT ENGINE) ────────────────────────────────────
-- Extends deployed_variants (Layer 2) so an audit can have more than one
-- active variant at once, each with a traffic-allocation weight. serve-variant
-- picks one per visitor via weighted random selection; record-variant-event
-- recalculates weights whenever a conversion is reported. Weights start equal
-- and stay near-equal with little data — that's the correct cold-start
-- behavior of a Laplace-smoothed estimate, not a bug.
--
-- variant_events logs both tiers: 'serve' (written server-side by
-- serve-variant on every pick) and 'convert' (client-reported via the new
-- record-variant-event endpoint, loosely defined for now as a primary-CTA
-- click).
--
-- variant_outcomes is scaffolding only, per the build plan — not populated
-- by this pass. It exists so cross-domain priors (aggregating outcomes by
-- archetype/industry once enough domains are generating data) have a
-- landing table later.

ALTER TABLE deployed_variants ADD COLUMN traffic_weight NUMERIC DEFAULT 1;

CREATE TABLE variant_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deployed_variant_id UUID REFERENCES deployed_variants(id),
  event_type TEXT NOT NULL, -- 'serve' | 'convert'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE variant_outcomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  archetype TEXT,
  industry TEXT,
  variant_pattern JSONB,
  aggregate_lift NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
