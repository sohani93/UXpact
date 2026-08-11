-- ─── VISION SANDBOX: RAW HTML CAPTURE ──────────────────────────────────────
-- The Vision sandbox's Python microservice needs the real fetched HTML (not
-- just the extracted dom_data fields) to reorder/sanitise actual DOM
-- structure. Nullable/additive — only audits run after this migration (and
-- the corresponding run-audit redeploy) will have raw_html populated.

ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS raw_html TEXT;
