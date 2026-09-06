-- Checkpoint 2: site-wide crawl. Diagnosis now reasons across the submitted
-- entry page plus a small set of matched high-signal pages (pricing, demo,
-- product/features, blog, about/contact — capped at MAX_CRAWL_PAGES in
-- run-audit). Each journey break needs to record which page it came from,
-- and the audits row needs a record of which pages were actually crawled
-- for a given run (RLS-readable, same anon-read pattern as everything else
-- the frontend reads directly). Additive only — existing single-page rows
-- get page_url = null, pages_crawled = null, both read as "not recorded"
-- rather than an error.

alter table archetype_consistency_scores
  add column if not exists page_url text;

alter table audits
  add column if not exists pages_crawled jsonb;

comment on column archetype_consistency_scores.page_url is 'The exact URL (from the audit''s crawled pages) this journey break was found on. Null on pre-crawl rows.';
comment on column audits.pages_crawled is 'Array of {url, category, matchedOn} for every page the site-wide crawl selected for this audit (always includes the entry page). Null on pre-crawl rows.';
