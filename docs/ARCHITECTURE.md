# Architecture

Updated as each module is added — not written once upfront.

## Shape

One Supabase Postgres project (`oxminualycvnxofoevjs`, "UXpact-v2") backing a
set of Deno Edge Functions, read by a single Vite/React frontend
(`engine-ui/`) hosted on Cloudflare Pages. One `audit_id` per submitted site
ties all data together.

## AI calls

`supabase/functions/_shared/ai-client.ts` is the one function every AI call
in the codebase goes through — `run-audit`, `generate-vision`,
`self-check-vision`, `check-drift` all import `callAi()` from it rather than
building their own provider request. Provider: Google Gemini
(`gemini-3.6-flash`, via `GEMINI_API_KEY`). See `docs/adr/001-gemini-provider-switch.md`.

## Edge Functions (current)

| Function | Role | Calls AI? |
|---|---|---|
| `run-audit` | Fetch one page, extract signals, diagnose journey, save `audits` + `archetype_consistency_scores` | Yes |
| `generate-vision` | Step 1 of Blueprint restructure: DOM-fidelity microservice + AI rewrite → `vision_generation_jobs` | Yes |
| `self-check-vision` | Step 2: critiques the draft against real journey breaks, revises if needed | Yes |
| `deploy-variant` | Extracts zone fragments from generated + raw HTML, inserts `deployed_variants` row | No |
| `serve-variant` | Weighted-random picks an active variant for a visitor, logs a `serve` event | No |
| `record-variant-event` | Logs a `convert` event, rebalances `traffic_weight` across active variants | No |
| `check-drift` | Reactive (embed script) or scheduled (pg_cron, every 6h) re-diagnosis + regression reasoning across full history | Yes |

`generate-vision`/`self-check-vision` are split into two functions (not
chained) because the full generate+critique+revise chain exceeds Supabase's
~150s per-invocation wall-clock limit.

## Frontend

`engine-ui/src/`. Being rebuilt per the locked 5-destination bottom-nav IA
(Diagnosis · Blueprint · Vision Pro · Pulse · Premium) — see BUILD_BOOK.md
for what's landed. The prior single continuous-scroll `Workspace.tsx` is
being replaced, not patched (see Pre-Build Verification Report in-session
for the full classification).

## Database

Migrations in `supabase/migrations/`, applied via Supabase MCP
`apply_migration` — never a dashboard edit. Current tables: `audits`,
`archetype_consistency_scores`, `vision_versions`, `vision_generation_jobs`,
`deployed_variants`, `deploy_snapshots`, `site_snapshots`, `drift_events`,
`variant_events`, `variant_outcomes`, plus legacy `audit_findings`/
`pulse_checklists`/`pulse_items` from the old rule-based engine (unused by
any live code path, kept only because dropping them is out of scope for
this build).
