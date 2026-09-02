# Build Book

One entry per completed step: what was built, how it was verified on real
production, what changed, timestamp. Replaces the prior Build Log.

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
