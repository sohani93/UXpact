# Build Book

One entry per completed step: what was built, how it was verified on real
production, what changed, timestamp. Replaces the prior Build Log.

**Known constraint:** Google AI Studio's free-tier Gemini key has a real,
low request-rate quota (confirmed in production: `limit: 20` requests,
free-tier 429s under normal load) — any pipeline firing many sequential AI
calls for one user action (e.g. one call per DOM block) can exhaust it and
outlast Supabase's ~150s edge function invocation ceiling; batch same-type
work into fewer calls where possible, and expect this ceiling to lift only
with a paid tier.

---

## 2026-09-04 — Checkpoint 1 close-out: per-section Blueprint generation, 503 retry, loading visual

**What was built:** Closed Checkpoint 1. `generate-vision` now generates
each DOM section separately (solving the whole-document size/timeout
ceiling), with every call sharing the chosen archetype + archetype
framework so a switched archetype produces one internally consistent
full-page rewrite. `ai-client`'s `callAi` retries once on a 503, a timeout,
or a 429. The audit-processing loading screen's node-map animation was
replaced with `SignalGrid` (full-bleed, mint/blue-violet ambient dot field).
On testing, real DOM blocks sharing one zone (myworks.software has 7
"features" blocks) were found to each fire their own sequential AI call,
which combined with the free-tier ceiling above caused a real stuck job
(`1618e9cc-fc4c-4a46-84d4-db05d70573dc`) that outlasted Supabase's
invocation ceiling — fixed by batching every block sharing a zone into one
`generateZoneGroup` structured-output call instead of one call per block.

**How verified on real production:** myworks.software, audit `af4d1c13`.
Job `4ab013a0` (before the token-budget fix) completed with real assembled
HTML (10 sections identified, 1 regenerated) but the hero section silently
truncated at a 3000-token output cap on this page's deeply-nested Elementor
markup — raised to 8000 and confirmed against real Gemini `finishReason`/
malformed-output logs. Job `1618e9cc` then surfaced the same-zone fan-out
problem directly via real 429/503 log lines and a `shutdown` event with no
terminal DB write, which motivated the zone-batching fix above. Re-ran the
identical myworks.software/Ruler job after the fix (job
`5e7ca5cf-2875-40c1-8f74-1262294a1761`): completed in ~35s with zero
429/503 errors logged for the "features" zone (previously 7 separate calls,
now 1), versus 2-4 minutes and repeated rate-limit failures before. Content
note: only 1 of the 7 features blocks came back meaningfully different from
its original text in both this run and the earlier per-block run — the
same pattern under both approaches, so not a batching regression, but
worth a closer look separately if it recurs against other pages.
`SignalGrid`/`LoadingState` visual spec verified by direct code read
against the reference image (dot spacing, colors, full-bleed layout,
preserved heading/status line).

**What changed:**
- `supabase/functions/generate-vision/index.ts`: per-section generation,
  shared archetype+framework context, sequential zone processing, new
  `generateZoneGroup` batched call for same-zone blocks.
- `supabase/functions/_shared/ai-client.ts`: `callAi` retry extended to
  429 (API-suggested backoff) alongside the existing 503/timeout retry.
- `vision-service/api/index.py`: tags every top-level block with its
  classified `data-uxpact-zone` (deployed to Vercel production).
- New: `engine-ui/src/components/SignalGrid.tsx`, `LoadingState.tsx`;
  `App.tsx` gained an input/loading mode split.

**Timestamp:** 2026-09-04.

---

## 2026-09-03 — Real-deploy bug pass: RLS gap, intake theme, archetype-chip clarity

**What was built:** Sohani opened the actual Cloudflare Pages deploy and found
real bugs no amount of code review had caught: Blueprint showed "No journey
breaks pinned" against a real, already-verified-working Gemini diagnosis
(audit `9306cd5e-90b9-4aa4-bada-d42985021106`, stripe.com), and the intake
form at `/` was still the old light theme.

**Root cause, confirmed not guessed:** `archetype_consistency_scores` and
`site_snapshots` had RLS enabled (migration 009) but were missed from
migration 010's anon SELECT grants — zero policies existed on either table.
The anon-key frontend client's reads were silently blocked (RLS returns an
empty result, not an error), even though `run-audit` had genuinely written
4 real rows for that audit. `mcp__supabase__execute_sql` (elevated
connection) showed the rows; a `pg_net` call using the real anon `apikey`/
`Authorization` header against the PostgREST endpoint — the exact path the
browser takes — returned nothing, proving the gap precisely.

**How verified on real production:**
- Applied migration `015_rls_journey_and_snapshots_read.sql` (anon SELECT on
  both tables) via `apply_migration`.
- Re-ran the identical anon-key PostgREST request against the existing
  Stripe audit: now returns all 4 real rows.
- Ran a **fresh** end-to-end audit (`https://www.notion.com`, new audit_id
  `0ed14ffc-9dca-4a16-803d-ae2d1dad8fbf`) to confirm the fix isn't
  retroactive-only: 3 real journey-break rows, readable via anon key,
  immediately.

**What changed:**
- New migration: `supabase/migrations/015_rls_journey_and_snapshots_read.sql`.
- Dark-theme restyle (logic untouched): `EngineInput.tsx`, `LoadingState.tsx`,
  `Nav.tsx`, `Blobs.tsx`, `Pill.tsx`, `CompactResults.tsx` — several had
  hardcoded dark-navy text that would have been invisible on a dark
  background.
- `Blueprint.tsx`: archetype-chip selection now shows an explicit note when
  the visible preview no longer matches the selected direction, instead of
  silently doing nothing (previous behavior) or faking an instant preview
  (the static mockup demo's behavior, not backed by a real generation call).
- Confirmed not a bug: the narrative verdict's tone was flagged as "hedgy"
  by Sohani — checked byte-for-byte against the stored `audits.narrative_verdict`
  row and it matches exactly. Real Gemini output, not something lost in
  rendering. Tone is a prompt-tuning question, not a pipeline defect.

**Not yet re-verified live in a real browser:** this sandbox's egress policy
still blocks direct browser/curl access to the production Supabase host, so
this fix is verified via the real anon-key REST path (network-equivalent to
what the browser does) rather than an actual Playwright pass. Sohani is
verifying visually via the Cloudflare preview deploy.

**Timestamp:** 2026-09-03.

---

## 2026-09-01/02 — Pre-build verification + AI provider switch

**What was built:** Verified all four existing backend pieces (Diagnosis
generation, Blueprint self-check, Vision Pro serving, Pulse drift detection)
against real production before writing any feature code, per the execution
plan. Found the project's Anthropic account had zero API credits, blocking
Diagnosis, Blueprint, and Pulse's regression-reasoning step in production.
Switched the shared AI-call path to Google Gemini and introduced the
previously-missing shared `callAi()` function
(`supabase/functions/_shared/ai-client.ts`). Removed dead code: the old
50-check rule-based engine files under `supabase/functions/run-audit/`
(`db.ts`, `scoring.ts`, `types.ts`, `checks/*`) that predated the AI-only
rewrite and were not imported by anything live.

**How verified on real production:**
- **Diagnosis generation:** fresh real call, `https://stripe.com`, audit_id
  `9306cd5e-90b9-4aa4-bada-d42985021106`. Narrative verdict specifically
  calls out that Stripe's testimonials section repeats the same Mindbody
  quote four times — independently confirmed true against the same
  response's `domData.testimonialTexts` (4 near-identical entries). Journey
  breaks cite real elements (hero headline, testimonials, pricing) with
  specific fixes. `ai_provider: "gemini-3.6-flash"` recorded on the row.
- **Vision Pro serving:** deploy-variant → serve-variant → record-variant-event
  chain run for real (not seeded) via `deployedVariantId e578893f-c982-4619-81fb-4d435b2259c2`:
  real zone-extraction, a real `serve` event, a real `convert` event, real
  Laplace-smoothed weight rebalance. No AI dependency, unaffected by the
  Anthropic outage.
- **Pulse drift detection:** `pg_cron` job `check-drift-scheduled-sweep`
  confirmed with 20 real successful executions (Aug 27–Sep 1) against
  `www.notion.com`; `site_snapshots.last_checked_at` matches. 5 real
  `drift_events` rows from Aug 27 carry genuine AI reasoning grounded in
  actual severity history.
- **Blueprint self-check:** code path confirmed real (reads actual
  `archetype_consistency_scores` rows, skeptical critique prompt) via
  historical evidence; not independently re-run after the provider switch
  in this entry — covered by the same shared client already proven working
  for Diagnosis and by Checkpoint 2's page-level Tester pass.

**What changed:**
- New file: `supabase/functions/_shared/ai-client.ts`.
- Modified: `run-audit`, `generate-vision`, `self-check-vision`,
  `check-drift` — all AI calls now go through `callAi()`.
- New migration: `supabase/migrations/014_ai_provider.sql` (`audits.ai_provider`).
- Deleted: `supabase/functions/run-audit/{db.ts,scoring.ts,types.ts,checks/*}`.
- New: `docs/adr/001-gemini-provider-switch.md`,
  `docs/contracts/{DiagnosisResult,VisionProVariant,PulseStatus}.md`,
  `docs/ARCHITECTURE.md`, this file.

**Timestamp:** 2026-09-02, ~10:15 UTC (final verified run).
