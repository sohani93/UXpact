# Contract: DiagnosisResult

**Module:** `supabase/functions/run-audit` (writer) · `engine-ui/src/pages/Diagnosis.tsx` (reader)
**Status:** real and verified, including the site-wide crawl (Checkpoint 2).
`run-audit` crawls the submitted entry page plus a small set of matched
high-signal pages (pricing, demo, product/features, most recent blog post,
about/contact — capped at `MAX_CRAWL_PAGES = 5` total, entry included), and
reasons across all of them in one Gemini call. `journeyBreaks` carry a
`page` field naming which crawled page they were found on.

## What `run-audit` exports (HTTP response)

```ts
interface DiagnosisResult {
  auditId: string | null;
  domData: DomData;                    // real extracted signals for the submitted entry page only
  currentArchetype: Archetype;         // Hero | Sage | Outlaw | Caregiver | Creator | Ruler
  targetArchetype: Archetype;
  narrativeVerdict: string | null;     // 2-3 sentences, reasoning across all crawled pages; null if the AI call failed
  revenueLeakEstimate: string | null;  // one of 4 fixed brackets, null if failed
  aiProvider: string | null;           // e.g. "gemini-3.6-flash", null if failed
  journeyBreaks: JourneyBreak[] | null; // flat list across all crawled pages
  pages: CrawledPageResult[];           // every page the crawl selected, entry always first
  diagnosisError: string | null;       // set (with narrativeVerdict etc. all null) when the AI call failed
}

interface JourneyBreak {
  page: string;                        // exact URL (from `pages`) this break was found on
  journeyStage: "arrival" | "understanding" | "trust-building" | "decision" | "action";
  element: string;
  whatsHappening: string;
  whatShouldHappen: string;
  reason: string;
  fix: string;
  aiPrompt: string;
}

interface CrawledPageResult {
  url: string;
  category: "entry" | "pricing" | "demo" | "product" | "blog" | "about";
  matchedOn: string;                   // human-readable reason this page was selected (link text or path)
  domData: DomData;                    // same shape as the top-level domData, for this page
  journeyBreaks: JourneyBreak[] | null; // this page's subset of the flat journeyBreaks list
}
```

## What the `audits` table row carries (read by the frontend directly via Supabase)

`id, url, domain, industry, goal, narrative_verdict, revenue_leak_estimate,
current_archetype, target_archetype, ai_provider, dom_data, raw_html,
pages_crawled`. `dom_data`/`raw_html` stay pinned to the single originally-
submitted entry page — the crawl only feeds Diagnosis, never Blueprint.
`pages_crawled` is `[{url, category, matchedOn}, ...]` for every page the
crawl selected (added in migration `016_site_wide_crawl.sql`; null on
pre-crawl audits). Per-break rows live in `archetype_consistency_scores`,
one row per journey break, keyed by `audit_id`, with a `page_url` column
(same migration) naming the source page; null on pre-crawl rows.

## Consumers

- The Diagnosis page renders `narrativeVerdict` first, then `journeyBreaks`
  in journey-stage order. No numeric score anywhere — this contract has none.
  Not yet updated to group breaks by page or show which pages were crawled —
  the data is there (`page_url` on each row, `pages_crawled` on the audit),
  but the UI still renders the flat list as before the crawl.
- Blueprint reads `dom_data`/`raw_html` (same row) for the Current-view
  facsimile — scoped to the single submitted page, unaffected by crawl.

## Site-wide crawl mechanics (`run-audit/index.ts`)

Never follows every link — matches a fixed category list
(`CATEGORY_PRIORITY`: pricing, demo, product, blog, about) by URL path or
link text against the entry page's same-origin links, one candidate per
category, in that priority order, capped at `MAX_CRAWL_PAGES - 1` additional
pages (the entry page always takes the first slot). A site matching fewer
categories gets fewer pages — never padded to the cap. A matched "blog" link
that looks like an index page is resolved one level deeper to what looks
like its most recent post (falls back to the index if none found). Real
test (basecamp.com, 2026-09-05): selected 4/5 pages — entry, pricing
(`/pricing`, matched via path), product (`/features`, link text "Features"),
about (`/about`, matched via path) — no demo or blog link exists in its
homepage nav, so those slots were correctly left empty.
