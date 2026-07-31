# UXpact — Claude Code Project Context

## What this product is
UXpact is a site story diagnostic and alignment engine for no-code founders. Not an audit tool. The 50-check rule-based engine finds problems. A Claude API narration layer explains what they mean in story + CRO terms.

Three questions the product answers:
1. What story is your site currently telling?
2. What story should it be telling?
3. Are you telling it yet?

## Read these Notion pages at the start of every session
- System Architecture: https://app.notion.com/p/314685bc7e8c8032a59fd690a25badf7
- Product Roadmap (phase checklists): https://app.notion.com/p/315685bc7e8c8050a52be5d8e8c7d4d1
- Strategy & Research: https://app.notion.com/p/310685bc7e8c801cb34fe0ccebbb9ac1
- UX Analysis Framework + Archetype System: https://app.notion.com/p/309685bc7e8c80a98cbede90561f93be
- Audit Pipeline: https://app.notion.com/p/315685bc7e8c80839cb1c5971dd8b8e3

The Product Roadmap is the live source of truth for what's done and what's next. Read it before starting work each session.

## Repo & infra
- GitHub: sohani93/UXpact (private)
- Live app: uxpact.pages.dev
- Supabase: oxminualycvnxofoevjs.supabase.co
- Framer marketing site embeds engine UI via iframe on /audit

## Tech stack
- Frontend: React + TypeScript + Vite → Cloudflare Pages
- Backend: Supabase Edge Functions (Deno/TypeScript)
- Database: Supabase Postgres
- Extension: Chrome/Edge Manifest V3 (Pulse)
- No Python. No new languages for Build 3.

## Critical rules — never break these
- Never overwrite the deployed Edge Function via PR. Read the deployed source in Supabase dashboard first, confirm it matches GitHub, then deploy via dashboard editor.
- Never use `npx wrangler deploy` for the frontend. Deploy via Cloudflare dashboard or `wrangler pages deploy`.
- Never add features that weren't asked for.
- Never make unrequested UI changes. Flag issues, don't fix them unilaterally.
- Always write an execution plan and confirm it before building.


## Design system — always match existing
- Fonts: Unbounded (headers, 660–700) + Space Grotesk (body, 400–500). Never add a third font.
- Palette: Forest Green #186132, Mint #14D571, Navy #0B1C48, Violet #5B61F4, Soft white #F9F9F9
- Primary gradient: #186132 → #14D571
- Aesthetic: light theme, glassmorphic cards, clean badges
- CTA button colour and position: locked — never change without explicit instruction
- Read existing component files before writing any new CSS. Never approximate — derive from actual measurements.

## End of every session
Update the Product Roadmap Notion page before closing:
- Tick off completed checklist items
- Add any new bugs or issues found as unchecked items under the relevant phase
- Add any architectural decisions made to the Strategy & Research decisions log
URL: https://app.notion.com/p/315685bc7e8c8050a52be5d8e8c7d4d1
