# AGENTS.md

## Project Overview

UXpact is a rule-based UX + Content Branding audit engine. Users enter a URL and industry type, and the engine instantly returns a scored audit with findings and fix prescriptions. No AI/LLM APIs are used — the UX Analysis Framework (50 checks with benchmarks and severity levels) IS the intelligence.

## Architecture

```
User enters URL + Industry
       ↓
Supabase Edge Function (Deno)
  - Fetches URL HTML + headers
  - Parses with deno-dom
  - Runs ~50 automated checks (Parts A, B, C)
  - Calls PageSpeed Insights API (free)
  - Calls Mozilla Observatory API (free)
  - Calculates scores
  - Stores results in Supabase Postgres
       ↓
React App (Vite + TypeScript)
  - /audit        → Engine UI (Input → Loading → Compact Results, state machine)
  - /report/:id   → Full Report (8-card sticky-stack)
  - /blueprint/:id → Conversion Blueprint (DOM facsimile + pin markers + fix drawer)
  - Deployed on Cloudflare Pages, embedded in Framer via iframe
       ↓
Pulse Chrome/Edge Extension (Manifest V3)
  - Synced checklist of fix items
  - Domain-specific floating widget (bottom-right)
  - Progress tracking → auto-disables on 100% completion
```

## Repository Structure

```
UXpact/
├── AGENTS.md
├── README.md
├── prototypes/                        # ← APPROVED UI PROTOTYPES. READ BEFORE BUILDING.
│   ├── UXpact_Engine_Input_v8.jsx     # Engine Input state
│   ├── uxpact-loading-full.jsx        # Loading state
│   ├── uxpact-results.jsx             # Compact Results state
│   ├── uxpact-full-report.jsx         # Full Report (/report/:id)
│   ├── uxpact-pulse-widget.jsx        # Pulse Widget (extension overlay)
│   └── UXpact_Blueprint_v2.jsx        # Conversion Blueprint (/blueprint/:id)
├── supabase/
│   ├── functions/
│   │   └── run-audit/
│   │       └── index.ts               # Main Edge Function
│   ├── migrations/
│   │   └── 001_create_tables.sql      # Full schema — run this first
│   └── config.toml
├── engine-ui/                         # React app (Vite + TypeScript)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   │   ├── checks/                # Individual check functions
│   │   │   ├── scoring.ts
│   │   │   └── types.ts
│   │   └── utils/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── pulse-extension/
│   ├── manifest.json
│   ├── popup/
│   ├── content/
│   ├── background/
│   └── assets/
└── docs/
    └── framework-checks.md
```

## ⚠️ Prototype Reference — Read This First

**Before writing any UI component, read the relevant file in `/prototypes/`.**

The prototype files are approved, pixel-perfect designs. They are the source of truth for:
- Component structure and layout
- Exact CSS values (colours, radii, padding, font sizes, shadows)
- Animation behaviour (timing, easing, transitions)
- Interaction logic (hover states, click targets, state transitions)

**Rules:**
- Extract style values directly from prototype source — do not estimate or invent
- If a prototype uses a specific `boxShadow` string, use that exact string
- If a prototype uses specific font sizes like `13.5px`, use `13.5px` — do not round
- The prototype wins on visual questions; this spec wins on structural/data questions
- Do not modify files in `/prototypes/` — they are read-only reference

**Prototype → Route mapping:**
| File | Used in |
|---|---|
| `UXpact_Engine_Input_v8.jsx` | `/audit` — input state |
| `uxpact-loading-full.jsx` | `/audit` — loading state |
| `uxpact-results.jsx` | `/audit` — compact results state |
| `uxpact-full-report.jsx` | `/report/:auditId` |
| `UXpact_Blueprint_v2.jsx` | `/blueprint/:auditId` |
| `uxpact-pulse-widget.jsx` | Extension content script overlay |

**CTA tray icons** (Full Report Card 8) are at:
```
https://raw.githubusercontent.com/sohani93/uxpact-assets/main/Download%20(Purple).png
https://raw.githubusercontent.com/sohani93/uxpact-assets/main/Blueprint%20(Green).png
https://raw.githubusercontent.com/sohani93/uxpact-assets/main/Pulse%20(Purple).png
```
Fetch at runtime or import directly — do not substitute with emoji or placeholder icons.

## Tech Stack

- **Runtime:** Deno (Supabase Edge Functions)
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + inline styles where Tailwind can't express exact values
- **Database:** Supabase Postgres
- **HTML Parsing:** deno-dom (@b-fuze/deno-dom)
- **PDF Generation:** jsPDF or @react-pdf/renderer (TBD — choose whichever works in Vite/browser)
- **Extension:** Chrome Manifest V3 (compatible with Edge)
- **Hosting:** Cloudflare Pages (React app)
- **Fonts:** Unbounded + Space Grotesk (Google Fonts)

## Coding Standards

- TypeScript everywhere (strict mode)
- Each audit check is a standalone function in `engine-ui/src/lib/checks/`
- Check functions follow this signature:
  ```ts
  interface CheckResult {
    id: string;           // e.g. "A1.1"
    name: string;         // e.g. "Hero headline exists"
    pass: boolean;
    score: number;        // 0–10
    severity: 'critical' | 'major' | 'minor';
    finding: string;      // what was found (or not found)
    fix: string;          // plain-English fix prescription (Blueprint only)
    aiPrompt: string;     // copyable AI prompt (Blueprint only)
    category: string;     // e.g. "First Impression & Clarity"
    part: 'A' | 'B' | 'C';
    domZone: string;      // Blueprint pin zone: 'hero' | 'nav' | 'cta' | 'social-proof' | 'body-copy' | 'footer'
    glossaryTerms: string[];
    manualReview: boolean;
  }

  type CheckFunction = (dom: Document, metadata: PageMetadata) => CheckResult;
  ```
- No console.log in production — use structured error handling
- All Supabase calls use the `@supabase/supabase-js` client
- Edge Functions use Deno imports (no npm)
- Fix prescriptions and AI prompts are stored in DB but **never rendered inline in findings cards** — Blueprint only

## Supabase Details

- **Project URL:** https://oxminualycvnxofoevjs.supabase.co
- **Edge Function CPU limit:** 2 seconds (network I/O excluded)
- **Schema:** defined in `supabase/migrations/001_create_tables.sql` — run this before anything else
- **Tables:** `audits`, `audit_findings`, `pulse_checklists`, `pulse_items`
- **Key column:** `audits.dom_data` (JSONB) — stores DOM facsimile data for Blueprint rendering

## Database: First Step

Before running any code, apply the migration:
```bash
supabase db push
# or paste 001_create_tables.sql directly into Supabase SQL Editor
```

Verify all 4 tables exist before proceeding.

## Testing

- Run Edge Functions locally: `supabase functions serve run-audit`
- Test: `curl -X POST http://localhost:54321/functions/v1/run-audit -H "Content-Type: application/json" -d '{"url":"https://example.com","industry":"saas"}'`
- React app: `cd engine-ui && npm run dev`
- Extension: Load unpacked in `chrome://extensions`

## Important Constraints

- **ZERO external AI/LLM API calls.** All checks are rule-based.
- **No screenshot APIs.** Analysis is HTML/DOM-only.
- **Free tier only** for all services.
- **Single page audit** — no multi-page crawling.
- Edge Function must complete within 2s CPU time.
- `/audit` is a state machine — Input → Loading → Results with no page reloads between states.
- Fix prescriptions and AI prompts live in the Blueprint only — not inline in the Full Report findings cards.
