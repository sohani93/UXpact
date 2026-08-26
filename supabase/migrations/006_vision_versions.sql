-- ─── VISION SANDBOX: SAVED VERSIONS ────────────────────────────────────────
-- Stores each generated Vision sandbox rebuild so users can revisit and
-- switch between prior generations without re-calling the LLM.
--
-- Already live in production (deployed directly ahead of this file being
-- tracked, same pattern as 004/005) — IF NOT EXISTS makes this a no-op there
-- and a real create on a fresh database or Supabase preview branch.

CREATE TABLE IF NOT EXISTS vision_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID REFERENCES audits(id),
  version_number INTEGER NOT NULL,
  archetype TEXT,
  section_order JSONB,
  copy_selections JSONB,
  html TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
