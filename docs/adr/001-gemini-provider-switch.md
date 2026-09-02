# ADR 001: Switch shared AI provider from Anthropic to Gemini

**Date:** 2026-09-02

## Decision

All AI calls in the codebase (`run-audit` diagnosis, `generate-vision` rewrite,
`self-check-vision` critique+revise, `check-drift` re-diagnosis + regression
reasoning) now go through one shared client, `supabase/functions/_shared/ai-client.ts`,
backed by Google Gemini via a free Google AI Studio key (`GEMINI_API_KEY`),
using model `gemini-3.6-flash`.

## Reasoning

Pre-build verification found the project's Anthropic account had a zero
credit balance — confirmed via real production logs (`run-audit` and
`check-drift` both hit `"Your credit balance is too low to access the
Anthropic API"` on real invocations, including a scheduled Pulse cron run).
This blocked every AI-dependent feature (Diagnosis, Blueprint, Pulse's
regression reasoning) in production, not just in this build.

The user directed a provider switch to Gemini rather than waiting on a
credits top-up. `gemini-2.5-flash` was the originally requested model, but
the live API rejected it with a 404 ("no longer available to new users")
and named `gemini-3.6-flash` as the replacement — confirmed directly
against the real API on the first real test call after the key was
configured, not assumed from training knowledge.

There was previously no single shared AI-call function despite the
execution plan requiring one — each of the four call sites duplicated its
own Anthropic fetch/SSE-parsing logic inline. This build introduced the
shared client as part of the provider switch, which the execution plan
already called for independently.

## Scope

- `generate-vision`'s draft-rewrite call was also switched, even though the
  user's instruction named only `run-audit`, `self-check-vision`, and
  `check-drift`. Leaving it on Anthropic would have kept Blueprint's
  "Generate" step (the first of two steps, before self-check) broken on the
  same exhausted-credits failure, defeating the purpose of the switch for
  that page. Treated as an implied requirement, not a scope expansion.
- `audits.ai_provider` (new column, migration `014_ai_provider.sql`) records
  which provider/model produced a given audit's diagnosis — `null` if the
  call failed, `"gemini-3.6-flash"` if it succeeded.
