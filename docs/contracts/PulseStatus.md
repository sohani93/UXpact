# Contract: PulseStatus

**Module:** `supabase/functions/check-drift` (writer, via `site_snapshots`) ·
`engine-ui/src/pages/Pulse.tsx` (reader)
**Status:** new contract. Backing data (`site_snapshots.last_checked_at`) is
real and already written by every `check-drift` run — confirmed via real
cron history (20 successful runs) — but nothing in the frontend reads it yet.

## Shape

```ts
interface PulseStatus {
  watching: boolean;        // true once a site_snapshots row exists for this audit
  lastCheckedAt: string | null;  // site_snapshots.last_checked_at, ISO timestamp
  lastFullCheckAt: string | null; // site_snapshots.last_full_check_at
}
```

Sourced by a direct Supabase read: `site_snapshots` filtered on `audit_id`,
selecting `last_checked_at, last_full_check_at`. `watching` is
`row !== null` — a site only gets a `site_snapshots` row once the embed
script has reported at least one visit, or the site has been through a
scheduled sweep. No separate edge function needed; this is read-only.

## Consumer

The Pulse page's "Watching Live" indicator: green/live when `watching` is
true and `lastCheckedAt` is within the 6h sweep interval; a distinct
"first check pending" state when `watching` is false (embed script
installed but no check has landed yet). Never fabricate a value — if the
row doesn't exist, show the pending state, not a fake timestamp.
