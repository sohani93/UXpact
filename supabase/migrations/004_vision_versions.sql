-- ─── VISION SANDBOX: SAVED VERSIONS ────────────────────────────────────────
-- Stores each generated Vision sandbox rebuild so users can revisit and
-- switch between prior generations without re-calling the LLM.

CREATE TABLE vision_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID REFERENCES audits(id),
  version_number INTEGER NOT NULL,
  archetype TEXT,
  section_order JSONB,
  copy_selections JSONB,
  html TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
