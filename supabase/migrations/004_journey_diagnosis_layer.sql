-- ─── BUILD 3.1: UX JOURNEY DIAGNOSIS LAYER ──────────────────────────────
-- Replaces the Build 3 "story narration" shape (narrative verdict was a single
-- archetype-personality blob) with a per-journey-stage breakdown. Deployed to
-- production ahead of this migration being committed — this file brings the
-- schema it depends on back into version control. Additive only.

ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS raw_html TEXT;

CREATE TABLE IF NOT EXISTS archetype_consistency_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES audits(id),
  narrative_verdict TEXT,
  current_archetype TEXT,
  target_archetype TEXT,
  journey_stage TEXT NOT NULL,
  element TEXT,
  current_archetype_signal TEXT,
  conflict_severity INTEGER,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
