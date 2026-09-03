# Build Book

One entry per completed step: what was built, how it was verified on real
production, what changed, timestamp. Replaces the prior Build Log.

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
