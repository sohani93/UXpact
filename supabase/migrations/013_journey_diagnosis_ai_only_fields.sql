-- The AI-only journey diagnosis (run-audit's full rewrite) generates its own
-- fix and ready-to-use AI prompt per journey break, and a revenue leak
-- estimate grounded in the specific breaks found — no rule-based findings
-- library or score-derived estimate. These columns store that.
alter table archetype_consistency_scores
  add column if not exists what_should_happen text,
  add column if not exists fix text,
  add column if not exists ai_prompt text;

alter table audits
  add column if not exists revenue_leak_estimate text;

comment on column archetype_consistency_scores.what_should_happen is 'What should happen at this journey stage instead, per the AI diagnosis.';
comment on column archetype_consistency_scores.fix is 'The AI''s concrete recommended fix for this journey break.';
comment on column archetype_consistency_scores.ai_prompt is 'A ready-to-use prompt for an AI coding tool to implement the fix on the real site.';
comment on column audits.revenue_leak_estimate is 'AI-estimated monthly revenue at risk, grounded in the number and severity of journey breaks found — not derived from a numeric score.';
