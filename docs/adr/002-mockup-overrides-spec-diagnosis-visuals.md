# ADR 002: Approved mockup overrides spec v3's Diagnosis "no carousel" text

**Date:** 2026-09-02

## Decision

The Diagnosis ("Story") page follows the approved visual-direction mockup
exactly, including a swipeable six-archetype card carousel and a numeric
conversion-rate benchmark chart ("Your hero page — 2.1%" vs "Category
benchmark — 3.8–5.2%"). The mockup's dark visual theme (near-black canvas,
`--forest:#1F8C4C`, `--mint:#14D571`, `--violet:#7B7FFF`, Unbounded/Space
Grotesk fonts) is the sitewide visual reference, not spec v3's brief color
list, wherever the two differ.

## Reasoning

The uploaded mockup HTML file was a browser "Save As" capture of a live
Claude Artifact page — the outer shell only, with no markup embedded (the
real content loads dynamically). Fetching the artifact directly (its URL
was recoverable from a comment in the saved file) revealed its actual
content, which conflicts with spec v3's explicit, repeated text: *"No
numeric score anywhere... not a personality quiz, no score, no badge, no
swipeable card stack... Rendered as prose only. No score, no card
carousel, no numeric badge."* The mockup's Diagnosis page has both a card
carousel and a numeric benchmark chart — the exact things that text
forbids, and the exact comparative-benchmark-stat spec v3 separately says
is out of scope for this build.

Flagged to the user directly rather than silently picking a side, since it
contradicts an explicit, repeated rule and the user's own description of
the mockup ("no card carousel") didn't match what the mockup actually
contains — a sign the two documents hadn't been reconciled. User's answer:
the mockup wins.

## Scope

- The revenue-leak card in the mockup stays — it matches spec's real,
  already-working `revenue_leak_estimate` field, just restyled.
- The conversion-rate benchmark chart ("2.1% vs 3.8–5.2%") has no real data
  source yet — spec v3 explicitly says this needs "a defined external data
  source and formula that doesn't exist yet." Per this ADR the chart is
  built visually, but its numbers are a labeled placeholder until that data
  source exists — never fabricated as if real. This must be called out
  clearly to Tester and in the Checkpoint 1 report; it does not block the
  rest of Diagnosis (narrative verdict, journey breakdown, revenue leak)
  from being genuinely real and Tester-verified.
- Everything else in the mockup (nav, Blueprint, Vision Pro, Pulse,
  Premium) already matched spec v3 — no conflict there, just adopted as the
  literal visual/structural reference per the original instruction to
  "match this visually and structurally."
