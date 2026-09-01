-- Records which AI provider/model actually produced an audit's diagnosis
-- (e.g. 'gemini-2.5-flash'). Null when the diagnosis call failed or hasn't
-- run yet, same convention as narrative_verdict/revenue_leak_estimate.
alter table audits
  add column if not exists ai_provider text;

comment on column audits.ai_provider is 'Which AI provider/model produced this audit''s narrative_verdict/journey diagnosis, e.g. "gemini-2.5-flash". Null if the AI call failed.';
