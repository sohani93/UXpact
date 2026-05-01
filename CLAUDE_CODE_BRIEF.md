# UXpact — Claude Code Context

## Who you are working with
Solo founder, non-developer. No local dev environment. All frontend changes deploy automatically via Cloudflare Pages on merge to `main`. Backend (Supabase Edge Function) does NOT auto-deploy — any changes to `supabase/functions/run-audit/index.ts` must be manually pasted into the Supabase dashboard after merge.

---

## What UXpact is
A rule-based UX + Content Branding audit engine. User enters a URL + industry type → gets an instant scored audit with findings and fix prescriptions → can view a Conversion Blueprint (DOM-reconstructed facsimile with fix pins) → uses Pulse browser extension to track implementation.

**No AI/LLM calls anywhere in the engine.** The 50-check UX Analysis Framework IS the intelligence. `ai_prompt` fields in `audit_findings` are pre-written rule-based templates stored in the DB — not live LLM calls.

---

## Stack
- **Frontend:** React + TypeScript + Vite — `engine-ui/`
- **Hosting:** Cloudflare Pages (auto-deploys on merge to `main`)
- **Backend:** Supabase Edge Function (Deno) — single monolith at `supabase/functions/run-audit/index.ts`
- **Database:** Supabase Postgres — `https://oxminualycvnxofoevjs.supabase.co`
- **Extension:** Pulse — Chrome/Edge Manifest V3 (separate from engine UI)
- **No local dev environment** — GitHub web UI only

---

## Current file structure (engine-ui/src)
```
engine-ui/src/
  components/
    ArcGauge.tsx       ← shared, used in LoadingState + FullReport
    Blobs.tsx          ← shared background blobs
    CompactResults.tsx
    EngineInput.tsx    ← audit form — DO NOT TOUCH submission logic
    LoadingState.tsx   ← scan animation + compact results reveal
    Nav.tsx            ← shared nav bar
    NodeMap.tsx        ← animated node graph in scan screen
    Pill.tsx           ← shared context pill component
  lib/
    supabase.ts        ← Supabase client — use this, never create a new one
    types.ts           ← shared TypeScript types
  pages/
    Blueprint.tsx      ← Conversion Blueprint screen
    FullReport.tsx     ← Full report workspace
  App.tsx              ← screen state machine
  main.tsx
  styles.css
prototypes/
  uxpact_v22.jsx       ← original prototype — source of truth for UI
```

---

## Screen flow (App.tsx state machine)
```
"input"     → EngineInput (form — working, do not break)
"scan"      → LoadingState (scan animation → compact results reveal)
"uxpact"    → FullReport (full report workspace)
"blueprint" → Blueprint (conversion blueprint)
"reaudit"   → ReauditScreen (Pro upsell — no live data needed)
"vision"    → VisionScreen (Pro upsell — no live data needed)
"plugins"   → PluginsScreen (Pro upsell — no live data needed)
```

---

## Data flow
1. `EngineInput` submits `{ url, industry, goals }` to Supabase Edge Function `run-audit`
2. Edge Function fetches URL, parses HTML, runs 50 checks, stores results, returns `{ audit_id }`
3. Frontend uses `audit_id` to fetch:
   - `audits` table (single row) — overall scores, dom_data, revenue bracket
   - `audit_findings` table (multiple rows) — all findings with severity, fix, ai_prompt, dom_zone
4. `audit_id` is passed through App.tsx state and available to all screens after scan completes

---

## Supabase schema (context only — not connected, use existing lib/supabase.ts)

### `audits` table
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| created_at | timestamptz | |
| url | text | |
| domain | text | |
| industry | text | |
| score | numeric | Overall weighted score (50% A + 30% B + 20% C) |
| part_a_score | numeric | Universal UX |
| part_b_score | numeric | Industry layer |
| part_c_score | numeric | Content Branding |
| score_label | text | Strong / Decent / Needs Work / Critical |
| checks_passed | int4 | |
| checks_flagged | int4 | |
| critical_issues | int4 | |
| status | text | |
| dom_data | jsonb | { h1Text, navLinks, ctaTexts, h2Texts, paragraphTexts } — Blueprint facsimile |
| name | text | Not written by engine — reserved |
| email | text | Not written by engine — reserved |
| goal | text | |

### `audit_findings` table
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| audit_id | uuid | FK → audits.id |
| check_id | text | e.g. "A1.1" |
| name | text | Finding title |
| severity | text | Critical / Major / Minor |
| finding | text | What's wrong |
| fix | text | How to fix it |
| score | int4 | |
| pass | bool | |
| dom_zone | text | Maps finding to Blueprint facsimile zone |
| category | text | |
| part | text | A / B / C |
| ai_prompt | text | Copyable fix prompt — pre-written template, NOT a live LLM call |
| completed | bool | Pulse checkbox state |
| completed_at | timestamptz | |
| glossary_terms | _text | |

---

## Revenue leak brackets
Single values — never ranges, never placeholders:
- £480/mo
- £1,100/mo
- £2,800/mo
- £5,200/mo

---

## Blueprint facsimile rules
- **Not a screenshot, not an iframe** — 100% DOM-reconstructed from `dom_data`
- `dom_data.navLinks` → rendered nav bar with real link labels
- `dom_data.h1Text` → hero heading
- `dom_data.h2Texts` → section subheadings
- `dom_data.ctaTexts` → CTA button labels
- `dom_data.paragraphTexts` → body text blocks
- Images = neutral placeholder blocks — never flagged as findings
- `dom_zone` maps each finding to a facsimile section for pin placement
- Pin colours: Critical = #EF4444, Major = #F59E0B, Minor = #EAB308

---

## Known issues (do not re-introduce)
- **Supabase client must never be initialised at module level** — only inside hooks/effects. Caused blank page crash on Cloudflare Pages previously.
- **NodeMap.tsx ctx null guard** — must be inside the `draw()` function, not just at `useEffect` level.

---

## Critical rules
- **Never create a new Supabase client** — use `lib/supabase.ts` only
- **Never hardcode Supabase credentials** — env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are already set in Cloudflare Pages
- **No LLM/AI API calls** — rule-based only
- **No screenshots, no iframes** in Blueprint
- **Do not touch `EngineInput.tsx` submission logic**
- **Ask before touching `supabase/functions/run-audit/index.ts`** — backend requires manual redeployment
- **One fix per commit** — never bundle multiple fixes
- **Prototype `prototypes/uxpact_v22.jsx` is the source of truth for all UI** — do not deviate from its layout, styling, or animations

---

## Deployment reminder (non-negotiable)
- **Frontend** → merge to `main` → Cloudflare Pages auto-deploys ✅
- **Backend** → merge does NOT deploy → must manually paste `index.ts` into Supabase dashboard → Edge Functions → run-audit → Code tab → Save/Deploy
