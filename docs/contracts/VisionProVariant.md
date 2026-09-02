# Contract: VisionProVariant

**Module:** `supabase/functions/{deploy-variant,serve-variant,record-variant-event}`
(writers) · `engine-ui/src/pages/VisionPro.tsx` (reader)
**Status:** serving verified live via a real manually-triggered deploy → serve →
convert chain (see BUILD_BOOK.md). `pending` state below is new, not yet built.

## `deployed_variants` row (extended)

```ts
interface DeployedVariant {
  id: string;
  audit_id: string;
  domain: string | null;
  variant_html: Record<string, string>;     // zone name -> HTML fragment
  is_active: boolean;                        // live/rolled-back gate, existing
  status: "live" | "pending_approval" | "rejected"; // NEW — approval-queue state
  traffic_weight: number;                    // Laplace-smoothed share, existing
  deployed_at: string;
}
```

`is_active` and `status` are independent: `is_active` still gates whether
`serve-variant` will ever pick this row for a visitor. A `pending_approval`
row must never be `is_active: true` — the agent proposes it, a human
approves it into `live` (which flips `is_active`), or rejects it into
`rejected` (which never goes live). No code path may set
`status: 'pending_approval'` and `is_active: true` on the same row.

## What each function exports (HTTP)

- `deploy-variant` → `{ deployedVariantId, embedSnippet }`. Always creates
  `status: 'live', is_active: true` today (human-initiated deploy from the
  Blueprint/Vision Pro UI, not the agent).
- `serve-variant` → `{ sections, deployedVariantId, driftCheckDue }`. Only
  ever selects from `is_active = true` rows — a `pending_approval` row is
  invisible to real traffic by construction, not by a filter this function
  has to remember to apply.
- `record-variant-event` → `{ recorded, rebalanced }`. Unaffected by `status`.

## Planned addition (plateau-detection checkpoint, not yet built)

A new agent-proposed-variant path inserts a row with
`status: 'pending_approval', is_active: false`. A new approve/reject UI
action either updates it to `status: 'live', is_active: true` (deactivating
prior live variants for the audit, same rule `deploy-variant` already
follows) or `status: 'rejected'` (terminal, never activated). The agent
itself never performs the approve step.
