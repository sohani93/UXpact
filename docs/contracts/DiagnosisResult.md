# Contract: DiagnosisResult

**Module:** `supabase/functions/run-audit` (writer) · `engine-ui/src/pages/Diagnosis.tsx` (reader)
**Status:** current shape is real and verified (single page). Will be extended in
the site-wide-crawl checkpoint to add a `pages` list — not built yet, tracked
here so the extension is deliberate, not incidental.

## What `run-audit` exports (HTTP response)

```ts
interface DiagnosisResult {
  auditId: string | null;
  domData: DomData;                    // real extracted signals for the submitted page
  currentArchetype: Archetype;         // Hero | Sage | Outlaw | Caregiver | Creator | Ruler
  targetArchetype: Archetype;
  narrativeVerdict: string | null;     // 2-3 sentences, null if the AI call failed
  revenueLeakEstimate: string | null;  // one of 4 fixed brackets, null if failed
  aiProvider: string | null;           // e.g. "gemini-3.6-flash", null if failed
  journeyBreaks: JourneyBreak[] | null;
  diagnosisError: string | null;       // set (with narrativeVerdict etc. all null) when the AI call failed
}

interface JourneyBreak {
  journeyStage: "arrival" | "understanding" | "trust-building" | "decision" | "action";
  element: string;
  whatsHappening: string;
  whatShouldHappen: string;
  reason: string;
  fix: string;
  aiPrompt: string;
}
```

## What the `audits` table row carries (read by the frontend directly via Supabase)

`id, url, domain, industry, goal, narrative_verdict, revenue_leak_estimate,
current_archetype, target_archetype, ai_provider, dom_data, raw_html`.
Per-break rows live in `archetype_consistency_scores`, one row per journey
break, keyed by `audit_id`.

## Consumers

- The Diagnosis page renders `narrativeVerdict` first, then `journeyBreaks`
  in journey-stage order. No numeric score anywhere — this contract has none.
- Blueprint reads `dom_data`/`raw_html` (same row) for the Current-view
  facsimile — scoped to the single submitted page, unaffected by crawl.

## Planned extension (site-wide-crawl checkpoint, not yet built)

A `pages: { url: string; domData: DomData; journeyBreaks: JourneyBreak[] }[]`
field will be added once `run-audit` crawls same-origin pages instead of
fetching one. `journeyBreaks` will gain a `page: string` (source URL) field.
`dom_data`/`raw_html` on the `audits` row stay pinned to the single
originally-submitted page — the crawl only feeds Diagnosis, never Blueprint.
