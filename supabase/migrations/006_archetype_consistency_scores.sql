-- ─── LAYER 1: UX JOURNEY DIAGNOSIS ─────────────────────────────────────────
-- Replaces the flat archetype-personality-mismatch framing with a
-- journey-stage-anchored breakdown (arrival/understanding/trust-building/
-- decision/action). journey_stage is constrained to those five values at the
-- application layer (Claude's structured-output schema enum + a defensive
-- filter before insert) rather than a DB CHECK constraint, consistent with
-- how severity/category enums are handled elsewhere in this schema.
--
-- conflict_severity is an integer 1-5 (5 = most severe/blocking) — net-new
-- scale, documented here since there's no prior numeric convention to match.

CREATE TABLE archetype_consistency_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
