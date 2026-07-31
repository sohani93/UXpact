-- ─── BUILD 3: STORY DIAGNOSTIC & ARCHETYPE LAYER ──────────────────────────────
-- All columns nullable — additive only, no breaking changes to existing schema.

ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS goal TEXT,
  ADD COLUMN IF NOT EXISTS narrative_verdict TEXT,
  ADD COLUMN IF NOT EXISTS cro_diagnosis TEXT,
  ADD COLUMN IF NOT EXISTS current_archetype TEXT,
  ADD COLUMN IF NOT EXISTS target_archetype TEXT,
  ADD COLUMN IF NOT EXISTS archetype_gap TEXT,
  ADD COLUMN IF NOT EXISTS story_fixes JSONB,
  ADD COLUMN IF NOT EXISTS vision_rewrite JSONB;
