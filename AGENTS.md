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
  - Runs ~25-28 automated checks
  - Calls PageSpeed Insights API (free)
  - Calls Mozilla Observatory API (free)
  - Calculates scores
  - Stores results in Supabase Postgres
       ↓
React App (Vite + TypeScript)
  - Compact results: Arc Gauge score + Category Bars + top findings
  - "Download Full Report" → PDF generation
  - Deployed on Cloudflare Pages, embedded in Framer via iframe
       ↓
Pulse Chrome/Edge Extension (Manifest V3)
  - Synced checklist of fix prescriptions
  - Domain-specific floating widget
  - Progress tracking → auto-disables on 100% completion
```

## Repository Structure

```
UXpact/
├── AGENTS.md                    # This file
├── README.md
├── supabase/
│   ├── functions/
│   │   └── run-audit/
│   │       └── index.ts         # Main Edge Function
│   ├── migrations/
│   │   └── 001_create_tables.sql
│   └── config.toml
├── engine-ui/                   # React app (Vite + TypeScript)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   │   ├── checks/          # Individual check functions
│   │   │   ├── scoring.ts       # Score calculation logic
│   │   │   └── types.ts         # TypeScript interfaces
│   │   └── utils/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── pulse-extension/             # Chrome/Edge extension
│   ├── manifest.json
│   ├── popup/
│   ├── content/
│   ├── background/
│   └── assets/
└── docs/                        # Reference docs
    └── framework-checks.md      # All 50 checks with benchmarks
```

## Tech Stack

- **Runtime:** Deno (Supabase Edge Functions)
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Database:** Supabase Postgres
- **HTML Parsing:** deno-dom (@b-fuze/deno-dom)
- **PDF Generation:** jsPDF or @react-pdf/renderer (TBD)
- **Extension:** Chrome Manifest V3 (compatible with Edge)
- **Hosting:** Cloudflare Pages (React app)

## Coding Standards

- TypeScript everywhere (strict mode)
- Each audit check is a standalone function in `engine-ui/src/lib/checks/`
- Check functions follow this signature:
  ```ts
  interface CheckResult {
    id: string;          // e.g., "A1.1"
    name: string;        // e.g., "Hero headline exists"
    pass: boolean;
    score: number;       // 0-10
    severity: 'critical' | 'major' | 'minor';
    finding: string;     // What was found (or not found)
    fix: string;         // Actionable fix prescription
    category: string;    // e.g., "First Impression & Clarity"
    part: 'A' | 'B' | 'C';
    manualReview: boolean; // true if check can't be fully automated
  }
  
  type CheckFunction = (dom: Document, metadata: PageMetadata) => CheckResult;
  ```
- No console.log in production code — use structured error handling
- All Supabase calls use the `@supabase/supabase-js` client
- Edge Functions use Deno imports (no npm)

## Supabase Details

- **Project URL:** https://oxminualycvnxofoevjs.supabase.co
- **Edge Function CPU limit:** 2 seconds (network I/O doesn't count)
- **Database tables:** `audits`, `audit_findings`, `pulse_checklists`, `pulse_items`

## Testing

- Run Edge Functions locally: `supabase functions serve run-audit`
- Test with: `curl -X POST http://localhost:54321/functions/v1/run-audit -H "Content-Type: application/json" -d '{"url":"https://example.com","industry":"saas"}'`
- React app: `cd engine-ui && npm run dev`
- Extension: Load unpacked in `chrome://extensions`

## Important Constraints

- **ZERO external AI/LLM API calls.** All checks are rule-based.
- **No screenshot APIs.** Analysis is HTML-only.
- **Free tier only** for all services.
- **Single page audit** — no multi-page crawling.
- Edge Function must complete within 2s CPU time.
